import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "./db";
import { apiKeys, workspaces } from "./db/schema";
import { eq } from "drizzle-orm";
import { redis } from "./redis";
import { checkRateLimit } from "./redis";
import { getEffectiveLimits } from "./billing/usage";

export const KEY_PREFIX = "lf";

export type KeyType = "secret" | "publishable";
export type ApiKeyMode = "full" | "read-only";

export interface AuthResult {
  workspaceId: string;
  keyId: string;
  keyType: KeyType;
  mode: ApiKeyMode;
}

interface CachedKey {
  id: string;
  workspaceId: string;
  keyType: KeyType;
  active: boolean;
  expiresAt: string | null;
}

interface CachedPlan {
  apiCallsPerHour: number;
}

const KEY_CACHE_TTL = 300; // 5 minutes
const PLAN_CACHE_TTL = 300;

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Invalidate API key cache (call when key is created/revoked). */
export async function invalidateApiKeyCache(keyHash: string): Promise<void> {
  await redis.del(`apikey:${keyHash}`).catch(() => {});
}

// ─── Per-Key Usage Tracking ─────────────────────────────────────────────────

function getApiKeyUsageKey(workspaceId: string, keyId: string): string {
  return `api-key-usage:${workspaceId}:${keyId}`;
}

/** Track API call for a specific key — increments hourly counter */
export async function trackApiKeyUsage(workspaceId: string, keyId: string): Promise<number> {
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const key = `${getApiKeyUsageKey(workspaceId, keyId)}:${hourKey}`;
  
  const count = await redis.incr(key);
  if (count === 1) {
    // Set TTL to 25 hours (keeps current hour + 24h of history)
    await redis.expire(key, 25 * 3600);
  }
  return count;
}

/** Get usage stats for a specific API key */
export async function getApiKeyUsage(
  workspaceId: string, 
  keyId: string
): Promise<{
  totalCalls: number;
  callsThisHour: number;
  callsToday: number;
  lastCall: string | null;
}> {
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const hourKeyYesterday = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate() - 1}-${now.getUTCHours()}`;
  
  const baseKey = getApiKeyUsageKey(workspaceId, keyId);
  
  // Get current hour
  const thisHourVal = await redis.get(`${baseKey}:${hourKey}`);
  const callsThisHour = thisHourVal ? Number(thisHourVal) : 0;
  
  // Get last 24 hours (approximate for today)
  let callsToday = callsThisHour;
  for (let h = 1; h < 24; h++) {
    const hKey = new Date(now.getTime() - h * 3600000);
    const hStr = `${hKey.getUTCFullYear()}-${hKey.getUTCMonth() + 1}-${hKey.getUTCDate()}-${hKey.getUTCHours()}`;
    const val = await redis.get(`${baseKey}:${hStr}`);
    if (val) callsToday += Number(val);
  }
  
  // Get last call timestamp
  const lastCallKey = `${baseKey}:last`;
  const lastCall = await redis.get(lastCallKey);
  
  return {
    totalCalls: callsToday, // Simplified: track as daily for now
    callsThisHour,
    callsToday,
    lastCall: lastCall ? String(lastCall) : null,
  };
}

/** Get usage for all API keys in a workspace */
export async function getAllApiKeyUsage(
  workspaceId: string,
  keyIds: string[]
): Promise<Record<string, { callsThisHour: number; callsToday: number; lastCall: string | null }>> {
  const result: Record<string, { callsThisHour: number; callsToday: number; lastCall: string | null }> = {};
  
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
  
  for (const keyId of keyIds) {
    const baseKey = getApiKeyUsageKey(workspaceId, keyId);
    
    // Get current hour
    const thisHourVal = await redis.get(`${baseKey}:${hourKey}`);
    const callsThisHour = thisHourVal ? Number(thisHourVal) : 0;
    
    // Get today (last 24 hours)
    let callsToday = callsThisHour;
    for (let h = 1; h < 24; h++) {
      const hKey = new Date(now.getTime() - h * 3600000);
      const hStr = `${hKey.getUTCFullYear()}-${hKey.getUTCMonth() + 1}-${hKey.getUTCDate()}-${hKey.getUTCHours()}`;
      const val = await redis.get(`${baseKey}:${hStr}`);
      if (val) callsToday += Number(val);
    }
    
    // Get last call timestamp
    const lastCallKey = `${baseKey}:last`;
    const lastCall = await redis.get(lastCallKey);
    
    result[keyId] = {
      callsThisHour,
      callsToday,
      lastCall: lastCall ? String(lastCall) : null,
    };
  }
  
  return result;
}

/** Record last call timestamp for a key */
export async function recordApiKeyLastCall(workspaceId: string, keyId: string): Promise<void> {
  const key = `${getApiKeyUsageKey(workspaceId, keyId)}:last`;
  await redis.set(key, new Date().toISOString(), { ex: 30 * 24 * 3600 }); // 30 days
}

/** Invalidate workspace plan cache (call when plan changes). */
export async function invalidatePlanCache(workspaceId: string): Promise<void> {
  await redis.del(`wplan:${workspaceId}`).catch(() => {});
}

/** Sync API key to Worker KV for edge validation. Fire-and-forget. */
async function syncApiKeyToEdge(
  keyHash: string,
  data: { active: boolean; expiresAt: string | null; keyType: string; workspaceId: string } | { remove: true },
): Promise<void> {
  const workerUrl = process.env.CF_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!workerUrl || !secret) return;
  fetch(`${workerUrl}/internal/api-key-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-worker-secret': secret },
    body: JSON.stringify({ keyHash, ...data }),
  }).catch(() => {});
}

export async function createApiKey(
  workspaceId: string,
  name: string,
  keyType: KeyType
): Promise<{ plaintextKey: string; keyPrefix: string; keyHash: string }> {
  const keyTypePart = keyType === "secret" ? "sk" : "pk";
  const token = randomHex(32);
  const plaintextKey = `${KEY_PREFIX}_${keyTypePart}_${token}`;
  const keyPrefix = plaintextKey.slice(0, 16);
  const keyHash = sha256(plaintextKey);

  await db.insert(apiKeys).values({
    workspaceId,
    name,
    keyPrefix,
    keyHash,
    keyType,
  });

  // Sync to Worker KV for edge validation
  syncApiKeyToEdge(keyHash, { active: true, expiresAt: null, keyType, workspaceId });

  return { plaintextKey, keyPrefix, keyHash };
}

export async function authenticateApiKey(
  request: Request
): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header." } },
      { status: 401 }
    );
  }

  const plaintextKey = authHeader.slice(7).trim();
  const prefix = `${KEY_PREFIX}_`;

  if (!plaintextKey.startsWith(prefix)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API key format. Key must start with 'lf_sk_' or 'lf_pk_'." } },
      { status: 401 }
    );
  }

  const keyHash = sha256(plaintextKey);

  // ── Read-through cache: Redis → Postgres ─────────────────────────────────

  // Check Redis cache first
  const cached = await redis.get(`apikey:${keyHash}`).catch(() => null);
  let keyData: CachedKey | null = cached && typeof cached === "string" ? JSON.parse(cached) : null;

  if (!keyData) {
    const [row] = await db
      .select({
        id: apiKeys.id,
        workspaceId: apiKeys.workspaceId,
        keyType: apiKeys.keyType,
        active: apiKeys.active,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid API key." } },
        { status: 401 }
      );
    }

    keyData = {
      id: row.id,
      workspaceId: row.workspaceId,
      keyType: row.keyType as KeyType,
      active: row.active,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    };

    // Populate cache (fire-and-forget)
    redis.setex(`apikey:${keyHash}`, KEY_CACHE_TTL, JSON.stringify(keyData)).catch(() => {});
  }

  if (!keyData.active) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "API key has been revoked." } },
      { status: 401 }
    );
  }

  if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "API key has expired." } },
      { status: 401 }
    );
  }

  const keyType = keyData.keyType;
  const mode: ApiKeyMode = keyType === "secret" ? "full" : "read-only";

  // ── Rate limit check per workspace plan (cached) ─────────────────────────

  const cachedPlan = await redis.get(`wplan:${keyData.workspaceId}`).catch(() => null);
  let apiCallsPerHour: number;

  if (cachedPlan && typeof cachedPlan === "string") {
    apiCallsPerHour = (JSON.parse(cachedPlan) as CachedPlan).apiCallsPerHour;
  } else {
    const limits = await getEffectiveLimits(keyData.workspaceId);
    apiCallsPerHour = limits.apiCallsPerHour;
    redis.setex(`wplan:${keyData.workspaceId}`, PLAN_CACHE_TTL, JSON.stringify({ apiCallsPerHour } as CachedPlan)).catch(() => {});
  }

  const hourlyKey = `usage:${keyData.workspaceId}:apiCallsPerHour:${new Date().toISOString().slice(0, 13)}`;
  const result = await checkRateLimit(hourlyKey, apiCallsPerHour, 3600);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `API rate limit exceeded for your plan (${apiCallsPerHour}/hour). Upgrade to increase your limit.`,
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": apiCallsPerHour.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetTime.toString(),
          "Retry-After": (result.resetTime - Math.floor(Date.now() / 1000)).toString(),
        },
      }
    );
  }

  // Update lastUsedAt (fire-and-forget, do not block)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyData.id))
    .catch(() => {});

  // Track per-key usage (fire-and-forget, do not block)
  trackApiKeyUsage(keyData.workspaceId, keyData.id).catch(() => {});
  recordApiKeyLastCall(keyData.workspaceId, keyData.id).catch(() => {});

  return {
    workspaceId: keyData.workspaceId,
    keyId: keyData.id,
    keyType,
    mode,
  };
}

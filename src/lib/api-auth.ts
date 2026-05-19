import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "./db";
import { apiKeys, workspaces } from "./db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "./redis";

export const KEY_PREFIX = "lf";

export type KeyType = "secret" | "publishable";
export type ApiKeyMode = "full" | "read-only";

export interface AuthResult {
  workspaceId: string;
  keyId: string;
  keyType: KeyType;
  mode: ApiKeyMode;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function createApiKey(
  workspaceId: string,
  name: string,
  keyType: KeyType
): Promise<{ plaintextKey: string; keyPrefix: string }> {
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

  return { plaintextKey, keyPrefix };
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

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!key) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API key." } },
      { status: 401 }
    );
  }

  if (!key.active) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "API key has been revoked." } },
      { status: 401 }
    );
  }

  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "API key has expired." } },
      { status: 401 }
    );
  }

  const keyType = key.keyType as KeyType;
  const mode: ApiKeyMode = keyType === "secret" ? "full" : "read-only";

  // Rate limit check per workspace plan
  const [workspace] = await db
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, key.workspaceId))
    .limit(1);

  if (workspace) {
    const { PLANS } = await import("./billing/plans");
    type PlanKey = keyof typeof PLANS;
    const plan = PLANS[workspace.plan as PlanKey] || PLANS.free;
    const limit = plan.limits.apiCallsPerHour;

    const hourlyKey = `usage:${key.workspaceId}:apiCallsPerHour:${new Date().toISOString().slice(0, 13)}`;
    const result = await checkRateLimit(hourlyKey, limit, 3600);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `API rate limit exceeded for your plan (${limit}/hour). Upgrade to increase your limit.`,
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetTime.toString(),
            "Retry-After": (result.resetTime - Math.floor(Date.now() / 1000)).toString(),
          },
        }
      );
    }
  }

  // Update lastUsedAt (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {});

  return {
    workspaceId: key.workspaceId,
    keyId: key.id,
    keyType,
    mode,
  };
}

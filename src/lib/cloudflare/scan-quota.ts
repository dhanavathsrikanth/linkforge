import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { workspaces } from "@/lib/db/schema";
import { scanCeilingForPlan } from "./safety-capabilities";

/**
 * Cost controls (Req 20).
 *
 * Tracks daily scan submission counts per workspace and globally in Redis
 * with a 24h TTL. Cron / API callers should consult `tryReserveScan` before
 * submitting to Cloudflare and `releaseReservation` if submission fails.
 */

const GLOBAL_CEILING = Number(process.env.URL_SCANNER_GLOBAL_DAILY_CAP ?? 50_000);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function workspaceKey(workspaceId: string): string {
  return `urlscanner:quota:ws:${workspaceId}:${todayKey()}`;
}

const GLOBAL_KEY = () => `urlscanner:quota:global:${todayKey()}`;

export type QuotaResult =
  | { allowed: true; remaining: number; ceiling: number }
  | { allowed: false; reason: "workspace" | "global"; ceiling: number; current: number };

/**
 * Atomically check + reserve one scan slot for the given workspace.
 * Returns `allowed: false` and does not consume a slot when over the ceiling.
 */
export async function tryReserveScan(workspaceId: string): Promise<QuotaResult> {
  // Resolve plan ceiling
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { plan: true },
  });
  const ceiling = scanCeilingForPlan(ws?.plan ?? "free");

  // Increment first, then check (Redis INCR is atomic). If we overshoot,
  // we decrement back down so the count stays accurate.
  const wsKey = workspaceKey(workspaceId);
  const wsCount = (await redis.incr(wsKey)) as number;
  if (wsCount === 1) {
    // Set TTL on first use of the day
    await redis.expire(wsKey, 24 * 60 * 60);
  }
  if (wsCount > ceiling) {
    await redis.decr(wsKey).catch(() => {});
    return { allowed: false, reason: "workspace", ceiling, current: wsCount - 1 };
  }

  const globalCount = (await redis.incr(GLOBAL_KEY())) as number;
  if (globalCount === 1) {
    await redis.expire(GLOBAL_KEY(), 24 * 60 * 60);
  }
  if (globalCount > GLOBAL_CEILING) {
    await redis.decr(wsKey).catch(() => {});
    await redis.decr(GLOBAL_KEY()).catch(() => {});
    return { allowed: false, reason: "global", ceiling: GLOBAL_CEILING, current: globalCount - 1 };
  }

  return { allowed: true, remaining: ceiling - wsCount, ceiling };
}

/** Roll back a reservation when the actual scan submission fails. */
export async function releaseReservation(workspaceId: string): Promise<void> {
  await redis.decr(workspaceKey(workspaceId)).catch(() => {});
  await redis.decr(GLOBAL_KEY()).catch(() => {});
}

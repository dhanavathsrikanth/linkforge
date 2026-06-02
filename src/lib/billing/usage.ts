import { eq, sql, and, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces, usageOverrides, domains, workspaceMembers, linkGallery, clickStats } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { PLANS, PlanKey, PlanLimits, LimitKey } from "./plans";

export type LimitCheckResult = {
  allowed: boolean;
  current: number;
  limit: number;
  unlimited: boolean;
  remaining: number;
};

export type UsageSummary = {
  limits: PlanLimits;
  current: Record<LimitKey, number>;
};

// ─── Counter Keys ─────────────────────────────────────────────────────────────
type CounterType = "customDomains" | "teamMembers" | "bioPages";

// Workspace usage key registry — tracks all usage keys per workspace
// Eliminates need for Redis SCAN operations
function getUsageKeySetKey(workspaceId: string): string {
  return `usage-keys:${workspaceId}`;
}

async function addUsageKey(workspaceId: string, key: string): Promise<void> {
  await redis.sadd(getUsageKeySetKey(workspaceId), key);
}

async function getUsageKeys(workspaceId: string): Promise<string[]> {
  return redis.smembers(getUsageKeySetKey(workspaceId)) as Promise<string[]>;
}

async function clearUsageKeySet(workspaceId: string): Promise<void> {
  const keys = await getUsageKeys(workspaceId);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(getUsageKeySetKey(workspaceId));
}

function getCounterKey(workspaceId: string, type: CounterType): string {
  return `counter:${workspaceId}:${type}`;
}

// ─── Counter Sync (lazy initialization) ───────────────────────────────────────
/**
 * Ensures the Redis counter matches the actual DB count.
 * Called on first access if counter doesn't exist or is stale.
 * Uses single DB query to count, then sets Redis counter.
 */
async function syncCounterToDB(workspaceId: string, type: CounterType): Promise<number> {
  let count = 0;

  if (type === "customDomains") {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(domains)
      .where(eq(domains.workspaceId, workspaceId));
    count = result[0]?.count ?? 0;
  } else if (type === "teamMembers") {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    count = result[0]?.count ?? 0;
  } else if (type === "bioPages") {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(linkGallery)
      .where(eq(linkGallery.workspaceId, workspaceId));
    count = result[0]?.count ?? 0;
  }

  // Set counter with TTL of 1 hour (refreshes on each check)
  const counterKey = getCounterKey(workspaceId, type);
  await redis.set(counterKey, count, { EX: 3600 });
  
  // Register key for deterministic cleanup (no SCAN needed)
  await addUsageKey(workspaceId, counterKey);
  
  return count;
}

/**
 * Gets the current counter value from Redis, syncing from DB if needed.
 */
async function getCounter(workspaceId: string, type: CounterType): Promise<number> {
  const key = getCounterKey(workspaceId, type);
  const cached = await redis.get(key);

  if (cached !== null) {
    return Number(cached);
  }

  // Cache miss - sync from DB
  return syncCounterToDB(workspaceId, type);
}

/**
 * Increments the counter (for new items). Returns the new count.
 */
async function incrementCounter(workspaceId: string, type: CounterType, count: number = 1): Promise<number> {
  const key = getCounterKey(workspaceId, type);
  const current = await redis.incrby(key, count);

  // Set TTL on first increment if not already set
  if (current === count) {
    await redis.expire(key, 3600);
  }

  return current;
}

/**
 * Decrements the counter (for deleted items). Returns the new count.
 */
async function decrementCounter(workspaceId: string, type: CounterType, count: number = 1): Promise<number> {
  const key = getCounterKey(workspaceId, type);
  const newVal = await redis.decrby(key, count);
  
  // Don't allow negative counters
  if (newVal < 0) {
    await redis.set(key, 0, { EX: 3600 });
    return 0;
  }
  
  return newVal;
}

/**
 * Resets a specific counter (for workspace deletion or manual reset).
 */
async function resetCounter(workspaceId: string, type: CounterType): Promise<void> {
  await redis.del(getCounterKey(workspaceId, type));
}

// Merges plan defaults with per-workspace usageOverrides
export async function getEffectiveLimits(workspaceId: string): Promise<PlanLimits> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const plan = workspace.plan as PlanKey;
  const defaultLimits = PLANS[plan].limits;

  const override = await db.query.usageOverrides.findFirst({
    where: eq(usageOverrides.workspaceId, workspaceId),
  });

  if (override && (!override.expiresAt || override.expiresAt > new Date())) {
    const mergedLimits = { ...defaultLimits } as Record<LimitKey, any>;
    for (const key of Object.keys(defaultLimits) as LimitKey[]) {
      if (key in override && override[key as keyof typeof override] !== null) {
        mergedLimits[key] = override[key as keyof typeof override];
      }
    }
    return mergedLimits as PlanLimits;
  }

  return defaultLimits as PlanLimits;
}

export async function checkLimit(
  workspaceId: string,
  limitKey: LimitKey,
  increment: boolean = false
): Promise<LimitCheckResult> {
  const limits = await getEffectiveLimits(workspaceId);
  const limit = limits[limitKey];

  if (typeof limit === "boolean") {
    return {
      allowed: limit,
      unlimited: false,
      current: limit ? 1 : 0,
      limit: limit ? 1 : 0,
      remaining: limit ? 1 : 0,
    };
  }

  if (limit as number === -1) {
    return { allowed: true, unlimited: true, current: 0, limit: -1, remaining: -1 };
  }

  // Monthly / time-based counters
  const isTimeBasedCounter = ["linksPerMonth", "clicksTrackedPerMonth", "qrCodesPerMonth", "apiCallsPerHour"].includes(limitKey);

  if (isTimeBasedCounter) {
    const now = new Date();
    // Use hourly key for API calls, monthly for others
    const timeKey = limitKey === "apiCallsPerHour"
      ? `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`
      : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    const redisKey = `usage:${workspaceId}:${limitKey}:${timeKey}`;

    let current = 0;
    if (increment) {
      current = await redis.incr(redisKey);
      if (current === 1) {
        if (limitKey === "apiCallsPerHour") {
          await redis.expire(redisKey, 3600);
        } else {
          // TTL to the end of the current month
          const nextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
          const ttlSeconds = Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
          await redis.expire(redisKey, ttlSeconds);
        }
        // Register key for deterministic cleanup (no SCAN needed)
        await addUsageKey(workspaceId, redisKey);
      }
    } else {
      const val = await redis.get(redisKey);
      current = val ? Number(val) : 0;
    }

    return {
      allowed: increment ? current <= limit : current < limit,
      current,
      limit,
      unlimited: false,
      remaining: Math.max(0, limit - current),
    };
  }

  // Static limits - use Redis counters with lazy DB sync
  const staticLimitMap: Record<string, CounterType> = {
    customDomains: "customDomains",
    teamMembers: "teamMembers",
    bioPages: "bioPages",
  };

  const counterType = staticLimitMap[limitKey];
  if (counterType) {
    let current = 0;
    if (increment) {
      current = await incrementCounter(workspaceId, counterType);
    } else {
      current = await getCounter(workspaceId, counterType);
    }

    return {
      allowed: current < limit,
      current,
      limit,
      unlimited: false,
      remaining: Math.max(0, limit - current),
    };
  }

  // Fallback for any other limits (shouldn't reach here)
  return {
    allowed: true,
    current: 0,
    limit,
    unlimited: false,
    remaining: limit,
  };
}

export async function resetUsageForWorkspace(workspaceId: string): Promise<void> {
  // Use key registry for deterministic O(1) cleanup — no SCAN needed
  const keys = await getUsageKeys(workspaceId);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  // Also reset the static counter keys
  await resetCounter(workspaceId, "customDomains");
  await resetCounter(workspaceId, "teamMembers");
  await resetCounter(workspaceId, "bioPages");
}

export async function getUsageSummary(workspaceId: string): Promise<UsageSummary> {
  const limits = await getEffectiveLimits(workspaceId);
  const current: Record<string, number> = {};

  const now = new Date();
  const timeKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const monthlyKeys = ["linksPerMonth", "clicksTrackedPerMonth", "qrCodesPerMonth"];
  for (const key of monthlyKeys) {
    const val = await redis.get(`usage:${workspaceId}:${key}:${timeKey}`);
    current[key] = val ? Number(val) : 0;
  }

  const hourlyTimeKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const apiVal = await redis.get(`usage:${workspaceId}:apiCallsPerHour:${hourlyTimeKey}`);
  current["apiCallsPerHour"] = apiVal ? Number(apiVal) : 0;

  // Static limits - use Redis counters instead of DB queries
  current["customDomains"] = await getCounter(workspaceId, "customDomains");
  current["teamMembers"] = await getCounter(workspaceId, "teamMembers");
  current["bioPages"] = await getCounter(workspaceId, "bioPages");

  current["abTestingEnabled"] = limits.abTestingEnabled ? 1 : 0;
  current["whiteLabelEnabled"] = limits.whiteLabelEnabled ? 1 : 0;
  current["bulkCreateEnabled"] = limits.bulkCreateEnabled ? 1 : 0;

  current["analyticsRetentionDays"] = limits.analyticsRetentionDays;

  return {
    limits,
    current: current as Record<LimitKey, number>,
  };
}

export type GetUsageResult = {
  linksCreated: number;
  domainsCreated: number;
  apiCalls: number;
  clicksTracked: number;
  monthStart: string;
};

export async function getUsage(workspaceId: string): Promise<GetUsageResult> {
  const summary = await getUsageSummary(workspaceId);
  const now = new Date();
  const firstOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

  return {
    linksCreated: summary.current.linksPerMonth ?? 0,
    domainsCreated: summary.current.customDomains ?? 0,
    apiCalls: summary.current.apiCallsPerHour ?? 0,
    clicksTracked: summary.current.clicksTrackedPerMonth ?? 0,
    monthStart: firstOfMonth.toISOString(),
  };
}

export async function incrementUsage(
  workspaceId: string,
  limitKey: string,
  count: number = 1
): Promise<number> {
  let mappedKey = limitKey;
  if (limitKey === "clicksTracked") mappedKey = "clicksTrackedPerMonth";
  if (limitKey === "links") mappedKey = "linksPerMonth";
  if (limitKey === "qrCodes") mappedKey = "qrCodesPerMonth";
  if (limitKey === "apiCalls") mappedKey = "apiCallsPerHour";

  const now = new Date();
  const isHourly = mappedKey === "apiCallsPerHour";
  const timeKey = isHourly
    ? `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const redisKey = `usage:${workspaceId}:${mappedKey}:${timeKey}`;
  const current = await redis.incrby(redisKey, count);
  if (current === count) {
    if (isHourly) {
      await redis.expire(redisKey, 3600);
    } else {
      const nextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
      const ttlSeconds = Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
      await redis.expire(redisKey, ttlSeconds);
    }
    // Register key for deterministic cleanup (no SCAN needed)
    await addUsageKey(workspaceId, redisKey);
  }
  return current;
}

// ─── Domain usage breakdown (custom-domain-assignment Req 21) ─────────────────

export type DomainUsage = {
  plan: PlanKey;
  limit: number;        // -1 = unlimited
  used: number;         // counts ALL rows (Req 22.4)
  active: number;
  disabled: number;     // over-limit after downgrade (oldest rows beyond limit)
  suspended: number;    // status != active
  atLimit: boolean;
};

/**
 * Returns the workspace's custom-domain consumption broken down into active /
 * disabled / suspended. Reuses the same row source as checkLimit — no separate
 * billing math. "Disabled" = rows beyond the plan limit after a downgrade
 * (oldest-first stay active, the overflow is considered disabled).
 */
export async function getDomainUsage(workspaceId: string): Promise<DomainUsage> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!workspace) throw new Error("Workspace not found");

  const plan = workspace.plan as PlanKey;
  const limits = await getEffectiveLimits(workspaceId);
  const limit = limits.customDomains as number;

  const rows = await db
    .select({ id: domains.id, status: domains.status, createdAt: domains.createdAt })
    .from(domains)
    .where(eq(domains.workspaceId, workspaceId));

  const used = rows.length;
  const suspended = rows.filter((r) => r.status && r.status !== "active").length;

  // Over-limit overflow → disabled. Oldest rows keep their slots.
  let disabled = 0;
  if (limit !== -1 && used > limit) {
    disabled = used - limit;
  }

  const active = used - suspended - disabled;

  return {
    plan,
    limit,
    used,
    active: Math.max(0, active),
    disabled,
    suspended,
    atLimit: limit !== -1 && used >= limit,
  };
}

/**
 * Returns the domain ids that are "disabled" by being over the plan limit
 * after a downgrade. Oldest, non-default domains keep their slots; the overflow
 * (newest-first) is disabled. Consumed by the pricing-spec downgrade flow to
 * flag/restrict serving without deleting rows (custom-domain-assignment Req 20/22.7).
 */
export async function getDisabledDomainIds(workspaceId: string): Promise<string[]> {
  const limits = await getEffectiveLimits(workspaceId);
  const limit = limits.customDomains as number;
  if (limit === -1) return [];

  const rows = await db
    .select({ id: domains.id, isDefault: domains.isDefault, createdAt: domains.createdAt })
    .from(domains)
    .where(eq(domains.workspaceId, workspaceId));

  if (rows.length <= limit) return [];

  // Keep oldest + default domains; disable the newest overflow.
  const ranked = [...rows].sort((a, b) => {
    // default always retained → sort first
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime(); // oldest first
  });
  return ranked.slice(limit).map((r) => r.id);
}
// ─── Counter Management Exports ─────────────────────────────────────────────
// These functions should be called by domain/member/bio-page create/delete handlers

/**
 * Call this when a new domain is created for a workspace.
 */
export async function onDomainCreated(workspaceId: string): Promise<number> {
  return incrementCounter(workspaceId, "customDomains");
}

/**
 * Call this when a domain is deleted from a workspace.
 */
export async function onDomainDeleted(workspaceId: string): Promise<number> {
  return decrementCounter(workspaceId, "customDomains");
}

/**
 * Call this when a new team member is added to a workspace.
 */
export async function onMemberAdded(workspaceId: string): Promise<number> {
  return incrementCounter(workspaceId, "teamMembers");
}

/**
 * Call this when a team member is removed from a workspace.
 */
export async function onMemberRemoved(workspaceId: string): Promise<number> {
  return decrementCounter(workspaceId, "teamMembers");
}

/**
 * Call this when a new bio page is created for a workspace.
 */
export async function onBioPageCreated(workspaceId: string): Promise<number> {
  return incrementCounter(workspaceId, "bioPages");
}

/**
 * Call this when a bio page is deleted from a workspace.
 */
export async function onBioPageDeleted(workspaceId: string): Promise<number> {
  return decrementCounter(workspaceId, "bioPages");
}

/**
 * Force-syncs all counters for a workspace from the database.
 * Useful after bulk imports or data migrations.
 */
export async function syncAllCounters(workspaceId: string): Promise<void> {
  await syncCounterToDB(workspaceId, "customDomains");
  await syncCounterToDB(workspaceId, "teamMembers");
  await syncCounterToDB(workspaceId, "bioPages");
}
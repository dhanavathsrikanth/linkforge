import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces, usageOverrides, domains, workspaceMembers, linkGallery } from "@/lib/db/schema";
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

  // Static limits (do not use Redis)
  let current = 0;
  if (limitKey === "customDomains") {
    const records = await db.select({ id: domains.id }).from(domains).where(eq(domains.workspaceId, workspaceId));
    current = records.length;
  } else if (limitKey === "teamMembers") {
    const records = await db.select({ id: workspaceMembers.id }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
    current = records.length;
  } else if (limitKey === "bioPages") {
    const records = await db.select({ id: linkGallery.id }).from(linkGallery).where(eq(linkGallery.workspaceId, workspaceId));
    current = records.length;
  }

  return {
    allowed: current < limit,
    current,
    limit,
    unlimited: false,
    remaining: Math.max(0, limit - current),
  };
}

export async function resetUsageForWorkspace(workspaceId: string): Promise<void> {
  const pattern = `usage:${workspaceId}:*`;
  let cursor = 0;

  do {
    const result = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = result[0] as unknown as number;
    const keys = result[1];

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
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

  current["customDomains"] = (await db.select({ id: domains.id }).from(domains).where(eq(domains.workspaceId, workspaceId))).length;
  current["teamMembers"] = (await db.select({ id: workspaceMembers.id }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId))).length;
  current["bioPages"] = (await db.select({ id: linkGallery.id }).from(linkGallery).where(eq(linkGallery.workspaceId, workspaceId))).length;

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
  }
  return current;
}
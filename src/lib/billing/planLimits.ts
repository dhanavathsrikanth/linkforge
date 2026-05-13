// src/lib/billing/planLimits.ts

export type PlanKey = 'free' | 'starter' | 'growth' | 'agency' | 'business' | 'enterprise';

export type LimitValue = number | 'unlimited';

export type PlanLimits = {
    links: LimitValue;
    domains: LimitValue;
    clicksTracked: LimitValue; // per month
    apiCalls: LimitValue;      // per month
    workspaces: LimitValue;
    whiteLabel?: boolean;
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
    free: {
        links: 500,
        domains: 1,
        clicksTracked: 5000,
        apiCalls: 1000,
        workspaces: 1,
    },
    starter: {
        links: 5000,
        domains: 2,
        clicksTracked: 50000,
        apiCalls: 10000,
        workspaces: 1,
    },
    growth: {
        links: 25000,
        domains: 5,
        clicksTracked: 250000,
        apiCalls: 100000,
        workspaces: 3,
    },
    agency: {
        links: 'unlimited',
        domains: 15,
        clicksTracked: 1000000,
        apiCalls: 'unlimited',
        workspaces: 10,
        whiteLabel: true,
    },
    business: {
        links: 'unlimited',
        domains: 25,
        clicksTracked: 'unlimited',
        apiCalls: 'unlimited',
        workspaces: 25,
    },
    enterprise: {
        links: 'unlimited',
        domains: 50,
        clicksTracked: 'unlimited',
        apiCalls: 'unlimited',
        workspaces: 100,
        whiteLabel: true,
    },
};

export function resolvePlanLimits(plan?: string): PlanLimits {
    const key = (plan || 'free').toLowerCase() as PlanKey;
    return PLAN_LIMITS[key] ?? PLAN_LIMITS.free;
}

export function isUnlimited(v: LimitValue) {
    return v === 'unlimited';
}

export function pct(current: number, max: LimitValue): number {
    if (isUnlimited(max)) return 0;
    if (max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
}
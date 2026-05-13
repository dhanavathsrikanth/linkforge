// src/lib/billing/planMap.ts
// Maps Dodo Payments product_id <-> internal plan keys so webhooks and checkout
// can translate between dashboard products and your app's plan enum.

import type { PlanKey } from "./planLimits";

type PlanEnvKeys = {
    free?: string;
    starter?: string;
    growth?: string;
    agency?: string;
    business?: string;
    enterprise?: string;
};

function trimOrUndef(v?: string | null): string | undefined {
    const s = (v ?? "").trim();
    return s.length > 0 ? s : undefined;
}

// Load product_id mapping from environment variables.
// Set these in .env.local (test) and .env (prod):
// - DODO_PLAN_FREE_PRODUCT_ID
// - DODO_PLAN_STARTER_PRODUCT_ID
// - DODO_PLAN_GROWTH_PRODUCT_ID
// - DODO_PLAN_AGENCY_PRODUCT_ID
// - DODO_PLAN_BUSINESS_PRODUCT_ID
// - DODO_PLAN_ENTERPRISE_PRODUCT_ID
export function loadPlanMapFromEnv(): Record<string, PlanKey> {
    const env: PlanEnvKeys = {
        free: trimOrUndef(process.env.DODO_PLAN_FREE_PRODUCT_ID),
        starter: trimOrUndef(process.env.DODO_PLAN_STARTER_PRODUCT_ID),
        growth: trimOrUndef(process.env.DODO_PLAN_GROWTH_PRODUCT_ID),
        agency: trimOrUndef(process.env.DODO_PLAN_AGENCY_PRODUCT_ID),
        business: trimOrUndef(process.env.DODO_PLAN_BUSINESS_PRODUCT_ID),
        enterprise: trimOrUndef(process.env.DODO_PLAN_ENTERPRISE_PRODUCT_ID),
    };

    const map: Record<string, PlanKey> = {};
    if (env.free) map[env.free] = "free";
    if (env.starter) map[env.starter] = "starter";
    if (env.growth) map[env.growth] = "growth";
    if (env.agency) map[env.agency] = "agency";
    if (env.business) map[env.business] = "business";
    if (env.enterprise) map[env.enterprise] = "enterprise";
    return map;
}

// Fallback mapping by human-readable product name if env IDs are not set.
export function guessPlanFromName(name?: string | null): PlanKey | undefined {
    const s = (name ?? "").toLowerCase();
    if (!s) return undefined;
    if (s.includes("starter")) return "starter";
    if (s.includes("growth") || s.includes("pro") || s.includes("premium")) return "growth";
    if (s.includes("agency")) return "agency";
    if (s.includes("business")) return "business";
    if (s.includes("enterprise")) return "enterprise";
    if (s.includes("free")) return "free";
    return undefined;
}

// Returns the internal plan for a given product_id (or undefined if unmapped).
export function mapProductToPlan(productId: string | null | undefined): PlanKey | undefined {
    if (!productId) return undefined;
    const map = loadPlanMapFromEnv();
    return map[productId];
}

// Returns the product_id to sell for an internal plan (or undefined if not configured).
export function planToProductId(plan: PlanKey): string | undefined {
    const envKey =
        plan === "free" ? "DODO_PLAN_FREE_PRODUCT_ID" :
            plan === "starter" ? "DODO_PLAN_STARTER_PRODUCT_ID" :
                plan === "growth" ? "DODO_PLAN_GROWTH_PRODUCT_ID" :
                    plan === "agency" ? "DODO_PLAN_AGENCY_PRODUCT_ID" :
                        plan === "business" ? "DODO_PLAN_BUSINESS_PRODUCT_ID" :
                            "DODO_PLAN_ENTERPRISE_PRODUCT_ID";

    return trimOrUndef(process.env[envKey as keyof NodeJS.ProcessEnv] as string | undefined);
}
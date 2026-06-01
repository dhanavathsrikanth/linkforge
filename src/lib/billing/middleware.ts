import { PLANS, LimitKey, PlanLimits } from "./plans";

export function billingLimitError(limitKey: string, current: number, limit: number, currentPlan: string) {
  const upgradeTo = Object.entries(PLANS).find(([key, plan]) => {
    const planLimit = (plan.limits as PlanLimits)[limitKey as LimitKey];
    return planLimit === -1 || (typeof planLimit === 'number' && planLimit > limit);
  })?.[0];

  return Response.json({
    success: false,
    error: {
      code: 'BILLING_LIMIT_EXCEEDED',
      message: `You've reached the ${limitKey} limit for your ${currentPlan} plan.`,
      current,
      limit,
      limitKey,
      currentPlan,
      upgradeTo,
    }
  }, { status: 402 });
}

/**
 * Returns a 402 FEATURE_NOT_AVAILABLE response for a gated boolean capability,
 * naming the cheapest plan that enables it. Returns null when the capability is
 * available (caller proceeds). custom-domain-assignment Req 23/24.
 */
export function featureGateError(
  featureKey: LimitKey,
  currentPlan: string,
) {
  const upgradeTo = Object.entries(PLANS).find(
    ([, plan]) => (plan.limits as PlanLimits)[featureKey] === true
  )?.[0];

  return Response.json({
    success: false,
    error: {
      code: 'FEATURE_NOT_AVAILABLE',
      message: `This feature isn't available on your ${currentPlan} plan.`,
      feature: featureKey,
      currentPlan,
      upgradeTo,
    }
  }, { status: 402 });
}

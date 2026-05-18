import { PLANS, LimitKey } from "./plans";

export function billingLimitError(limitKey: string, current: number, limit: number, currentPlan: string) {
  const upgradeTo = Object.entries(PLANS).find(([key, plan]) => {
    const planLimit = plan.limits[limitKey as LimitKey];
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

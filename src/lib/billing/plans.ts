export const PLANS = {
  free: {
    name: 'Free', price: 0, annualPrice: 0,
    dodoPriceId: { monthly: null, annual: null },
    limits: {
      linksPerMonth: 500,
      clicksTrackedPerMonth: 5000,
      customDomains: 0,
      teamMembers: 1,
      apiCallsPerHour: 100,
      bioPages: 1,
      qrCodesPerMonth: 50,
      analyticsRetentionDays: 30,
      abTestingEnabled: false,
      whiteLabelEnabled: false,
      bulkCreateEnabled: false,
    },
  },
  starter: {
    name: 'Starter', price: 12, annualPrice: 9,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_STARTER_MONTHLY!,
      annual:  process.env.DODO_PRICE_STARTER_ANNUAL!,
    },
    limits: {
      linksPerMonth: 5000,
      clicksTrackedPerMonth: 100000,
      customDomains: 2,
      teamMembers: 2,
      apiCallsPerHour: 1000,
      bioPages: 2,
      qrCodesPerMonth: 500,
      analyticsRetentionDays: 90,
      abTestingEnabled: false,
      whiteLabelEnabled: false,
      bulkCreateEnabled: false,
    },
  },
  growth: {
    name: 'Growth', price: 39, annualPrice: 29,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_GROWTH_MONTHLY!,
      annual:  process.env.DODO_PRICE_GROWTH_ANNUAL!,
    },
    limits: {
      linksPerMonth: 25000,
      clicksTrackedPerMonth: 1000000,
      customDomains: 5,
      teamMembers: 10,
      apiCallsPerHour: 5000,
      bioPages: 5,
      qrCodesPerMonth: -1,
      analyticsRetentionDays: 365,
      abTestingEnabled: true,
      whiteLabelEnabled: false,
      bulkCreateEnabled: true,
    },
  },
  agency: {
    name: 'Agency', price: 99, annualPrice: 79,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_AGENCY_MONTHLY!,
      annual:  process.env.DODO_PRICE_AGENCY_ANNUAL!,
    },
    limits: {
      linksPerMonth: -1,
      clicksTrackedPerMonth: -1,
      customDomains: 15,
      teamMembers: 25,
      apiCallsPerHour: 20000,
      bioPages: -1,
      qrCodesPerMonth: -1,
      analyticsRetentionDays: 730,
      abTestingEnabled: true,
      whiteLabelEnabled: true,
      bulkCreateEnabled: true,
    },
  },
  business: {
    name: 'Business', price: 249, annualPrice: 199,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_BUSINESS_MONTHLY!,
      annual:  process.env.DODO_PRICE_BUSINESS_ANNUAL!,
    },
    limits: {
      linksPerMonth: -1,
      clicksTrackedPerMonth: -1,
      customDomains: 25,
      teamMembers: 100,
      apiCallsPerHour: 50000,
      bioPages: -1,
      qrCodesPerMonth: -1,
      analyticsRetentionDays: 1825,
      abTestingEnabled: true,
      whiteLabelEnabled: true,
      bulkCreateEnabled: true,
    },
  },
} as const;

// -1 = unlimited. Export helper types.
export type PlanKey = keyof typeof PLANS;
export type PlanLimits = typeof PLANS.free.limits;
export type LimitKey = keyof PlanLimits;

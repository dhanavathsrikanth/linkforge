export const PLANS = {
  free: {
    name: 'Free', price: 0, annualPrice: 0,
    dodoPriceId: { monthly: null, annual: null },
    limits: {
      maxOrganizations: 0,
      linksPerMonth: 50,
      clicksTrackedPerMonth: 1000,
      customDomains: 1,
      teamMembers: 1,
      apiCallsPerHour: 3600,
      bioPages: 1,
      qrCodesPerMonth: 50,
      analyticsRetentionDays: 30,
      abTestingEnabled: false,
      whiteLabelEnabled: false,
      bulkCreateEnabled: false,
      defaultDomainEnabled: false,
      mixedDomainRoleEnabled: false,
    },
  },
  starter: {
    name: 'Starter', price: 29, annualPrice: 24,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_STARTER_MONTHLY!,
      annual:  process.env.DODO_PRICE_STARTER_ANNUAL!,
    },
    limits: {
      maxOrganizations: 1,
      linksPerMonth: 5000,
      clicksTrackedPerMonth: 50000,
      customDomains: 3,
      teamMembers: 3,
      apiCallsPerHour: 1000,
      bioPages: 5,
      qrCodesPerMonth: 500,
      analyticsRetentionDays: 90,
      abTestingEnabled: true,
      whiteLabelEnabled: false,
      bulkCreateEnabled: false,
      defaultDomainEnabled: true,
      mixedDomainRoleEnabled: true,
    },
  },
  growth: {
    name: 'Growth', price: 79, annualPrice: 65,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_GROWTH_MONTHLY!,
      annual:  process.env.DODO_PRICE_GROWTH_ANNUAL!,
    },
    limits: {
      maxOrganizations: 3,
      linksPerMonth: 25000,
      clicksTrackedPerMonth: 500000,
      customDomains: 10,
      teamMembers: 10,
      apiCallsPerHour: 5000,
      bioPages: 20,
      qrCodesPerMonth: -1,
      analyticsRetentionDays: 365,
      abTestingEnabled: true,
      whiteLabelEnabled: true,
      bulkCreateEnabled: true,
      defaultDomainEnabled: true,
      mixedDomainRoleEnabled: true,
    },
  },
  agency: {
    name: 'Agency', price: 99, annualPrice: 79,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_AGENCY_MONTHLY!,
      annual:  process.env.DODO_PRICE_AGENCY_ANNUAL!,
    },
    limits: {
      maxOrganizations: -1,
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
      maxOrganizations: -1,
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
      defaultDomainEnabled: true,
      mixedDomainRoleEnabled: true,
    },
  },
  enterprise: {
    name: 'Enterprise', price: 499, annualPrice: 399,
    dodoPriceId: {
      monthly: process.env.DODO_PRICE_ENTERPRISE_MONTHLY!,
      annual:  process.env.DODO_PRICE_ENTERPRISE_ANNUAL!,
    },
    limits: {
      maxOrganizations: -1,
      linksPerMonth: -1,
      clicksTrackedPerMonth: -1,
      customDomains: 50,
      teamMembers: -1,
      apiCallsPerHour: -1,
      bioPages: -1,
      qrCodesPerMonth: -1,
      analyticsRetentionDays: 3650,
      abTestingEnabled: true,
      whiteLabelEnabled: true,
      bulkCreateEnabled: true,
      defaultDomainEnabled: true,
      mixedDomainRoleEnabled: true,
    },
  },
} as const;

// -1 = unlimited. Export helper types.
export type PlanKey = keyof typeof PLANS;
export type PlanLimits = {
  maxOrganizations: number;
  linksPerMonth: number;
  clicksTrackedPerMonth: number;
  customDomains: number;
  teamMembers: number;
  apiCallsPerHour: number;
  bioPages: number;
  qrCodesPerMonth: number;
  analyticsRetentionDays: number;
  abTestingEnabled: boolean;
  whiteLabelEnabled: boolean;
  bulkCreateEnabled: boolean;
  defaultDomainEnabled: boolean;
  mixedDomainRoleEnabled: boolean;
};
export type LimitKey = keyof PlanLimits;

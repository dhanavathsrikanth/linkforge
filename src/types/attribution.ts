export interface Touchpoint {
  linkId: string;
  slug: string;
  destination: string;
  timestamp: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  country?: string;
  device?: string;
}

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export interface AttributionReport {
  model: AttributionModel;
  totalConversions: number;
  totalRevenue: number;
  linkCredits: LinkCredit[];
  topPath: CustomerPath[];
  avgTouchpointsToConvert: number;
  avgDaysToConvert: number;
}

export interface LinkCredit {
  linkId: string;
  slug: string;
  destination: string;
  credit: number;
  creditValue: number;
  assistedConversions: number;
  directConversions: number;
}

export interface CustomerPath {
  touchpoints: string[];
  count: number;
  conversions: number;
  totalValue: number;
}

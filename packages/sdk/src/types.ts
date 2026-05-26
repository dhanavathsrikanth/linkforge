export interface Link {
  id: string;
  workspaceId: string;
  shortUrl: string;
  destination: string;
  slug: string;
  domain: string;
  title: string | null;
  description: string | null;
  tags: string[];
  isActive: boolean;
  expiresAt: string | null;
  clickLimit: number | null;
  totalClicks: number;
  uniqueClicks: number;
  password: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  abTestEnabled: boolean;
  abTestVariants: ABVariant[] | null;
  iosDestination: string | null;
  androidDestination: string | null;
  geoRouting: Record<string, string> | null;
  qrSettings: QRSettings | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLinkOptions {
  destination: string;
  slug?: string;
  domain?: string;
  title?: string;
  tags?: string[];
  expiresAt?: string;
  clickLimit?: number;
  password?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  abTest?: {
    enabled: boolean;
    variants: Array<{ destination: string; weight: number; label: string }>;
  };
  smartRouting?: {
    ios?: string;
    android?: string;
    geo?: Record<string, string>;
  };
}

export interface UpdateLinkOptions extends Partial<CreateLinkOptions> {
  isActive?: boolean;
}

export interface ListLinksOptions {
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: "clicks" | "created" | "updated";
  order?: "asc" | "desc";
  isActive?: boolean;
}

export interface LinkList {
  links: Link[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface LinkAnalytics {
  summary: {
    totalClicks: number;
    uniqueClicks: number;
    totalConversions: number;
    conversionRate: number;
    comparedToPrevious: { clicks: number; uniqueClicks: number };
  };
  timeSeries: { labels: string[]; clicks: number[]; uniqueClicks: number[] };
  geography: { byCountry: Array<{ country: string; clicks: number; percentage: number }> };
  devices: { byDeviceType: Array<{ type: string; clicks: number; percentage: number }> };
  browsers: { byBrowser: Array<{ browser: string; clicks: number; percentage: number }> };
  referrers: { byType: Array<{ type: string; clicks: number }> };
  abTestResults: ABTestResult | null;
}

export interface AnalyticsOptions {
  range?: "1h" | "24h" | "7d" | "30d" | "90d" | "365d";
  startDate?: string;
  endDate?: string;
  groupBy?: "hour" | "day" | "week" | "month";
}

export interface ABVariant {
  id: string;
  destination: string;
  weight: number;
  label: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export interface ABTestResult {
  winner: string | null;
  confidence: number;
  isSignificant: boolean;
  recommendation: string;
  variantStats: Array<{
    destination: string;
    label: string;
    clicks: number;
    conversionRate: number;
    relativeUplift: number;
    pValue: number;
    isControl: boolean;
  }>;
}

export interface QRSettings {
  fgColor: string;
  bgColor: string;
  errorLevel: "L" | "M" | "Q" | "H";
  size: number;
  logoUrl?: string;
  rounded: boolean;
  frameStyle: "none" | "border" | "scan-me";
}

export interface QRCodeOptions {
  size?: number;
  fgColor?: string;
  bgColor?: string;
  errorLevel?: "L" | "M" | "Q" | "H";
  format?: "png" | "svg";
  logoUrl?: string;
  rounded?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "growth" | "agency" | "business" | "enterprise";
  usage: {
    linksThisMonth: number;
    clicksThisMonth: number;
    customDomains: number;
    teamMembers: number;
  };
  limits: {
    linksPerMonth: number;
    clicksTrackedPerMonth: number;
    customDomains: number;
    teamMembers: number;
  };
}

export interface ConversionEvent {
  linkId: string;
  event: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  customerId?: string;
}

export interface AttributionReport {
  model: "first_touch" | "last_touch" | "linear" | "time_decay";
  totalConversions: number;
  totalRevenue: number;
  linkCredits: Array<{
    linkId: string;
    slug: string;
    credit: number;
    creditValue: number;
    assistedConversions: number;
    directConversions: number;
  }>;
  avgTouchpointsToConvert: number;
  avgDaysToConvert: number;
}

export interface PivotUrlError extends Error {
  code: string;
  status: number;
}

export interface PivotUrlConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retry?: { attempts: number; delay: number };
}

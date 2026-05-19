export interface LinkData {
  id: string;
  workspaceId: string;
  userId: string | null;
  domainId: string | null;
  slug: string;
  destination: string;
  title: string | null;
  description: string | null;
  tags: string[];
  password: string | null;
  expiresAt: string | null;
  clickLimit: number | null;
  totalClicks: number;
  uniqueClicks: number;
  isActive: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  iosDestination: string | null;
  androidDestination: string | null;
  abTestEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkListMeta {
  total: number;
  offset: number;
  limit: number;
}

export interface LinkListResponse {
  data: LinkData[];
  meta: LinkListMeta;
}

export interface CreateLinkInput {
  destination: string;
  slug?: string;
  title?: string;
  description?: string;
  password?: string;
  tags?: string[];
  expiresAt?: string;
  clickLimit?: number | null;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  iosDestination?: string;
  androidDestination?: string;
  abTestEnabled?: boolean;
}

export interface UpdateLinkInput {
  destination?: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: string | null;
  clickLimit?: number | null;
  password?: string;
  isActive?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  iosDestination?: string;
  androidDestination?: string;
  abTestEnabled?: boolean;
}

export interface AnalyticsOverview {
  totalClicks: number;
  uniqueClicks: number;
  clicksToday: number;
  clicksGrowth: number;
  topLink: { id: string; slug: string; clicks: number } | null;
  topCountry: string;
  topDevice: string;
}

export interface AnalyticsBreakdownItem {
  label: string;
  clicks: number;
  percentage: number;
}

export interface AnalyticsTimeseriesItem {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

export interface AnalyticsTopLink {
  id: string;
  title: string;
  slug: string;
  url: string;
  clicks: number;
  uniqueClicks: number;
  ctr: number;
  trend: number[];
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyType: "secret" | "publishable";
  lastUsedAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreatedApiKey {
  name: string;
  keyPrefix: string;
  keyType: "secret" | "publishable";
  plaintextKey: string;
}

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

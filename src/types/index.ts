import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  workspaces,
  workspaceMembers,
  domains,
  links,
  clicks,
  conversions,
} from "@/lib/db/schema";

// ─── Drizzle inferred types ───────────────────────────────────────────────────

// users
export type User           = InferSelectModel<typeof users>;
export type NewUser        = InferInsertModel<typeof users>;

// workspaces
export type Workspace      = InferSelectModel<typeof workspaces>;
export type NewWorkspace   = InferInsertModel<typeof workspaces>;

// workspaceMembers
export type WorkspaceMember    = InferSelectModel<typeof workspaceMembers>;
export type NewWorkspaceMember = InferInsertModel<typeof workspaceMembers>;

// domains
export type Domain         = InferSelectModel<typeof domains>;
export type NewDomain      = InferInsertModel<typeof domains>;

// links
export type Link           = InferSelectModel<typeof links>;
export type NewLink        = InferInsertModel<typeof links>;

// clicks
export type Click          = InferSelectModel<typeof clicks>;
export type NewClick       = InferInsertModel<typeof clicks>;

// conversions
export type Conversion     = InferSelectModel<typeof conversions>;
export type NewConversion  = InferInsertModel<typeof conversions>;

// ─── Enum value types ─────────────────────────────────────────────────────────

export type Plan         = User["plan"];
export type MemberRole   = WorkspaceMember["role"];
export type DeviceType   = Click["device"];

// ─── Composite / enriched types ───────────────────────────────────────────────

export type LinkWithDomain = Link & {
  domain: Domain | null;
};

export type LinkWithStats = Link & {
  domain: Domain | null;
  recentClicks: Click[];
};

export type WorkspaceWithMembers = Workspace & {
  members: (WorkspaceMember & { user: User })[];
};

// ─── A/B test variant ─────────────────────────────────────────────────────────

export interface AbTestVariant {
  destination: string;
  weight: number;   // 0–100, must sum to 100
  clicks: number;
}

// ─── Geo routing ─────────────────────────────────────────────────────────────

export type GeoRouting = Record<string, string>; // { "US": "https://...", "GB": "https://..." }

// ─── API response wrappers ────────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T; error?: never };
export type ApiError      = { error: string; code?: string; data?: never };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ClickStats {
  total: number;
  unique: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface TimeSeriesPoint {
  date: string;      // ISO date string
  clicks: number;
  unique: number;
}

export interface GeoStat {
  country: string;
  count: number;
  percentage: number;
}

export interface DeviceStat {
  device: DeviceType;
  count: number;
  percentage: number;
}

export interface ReferrerStat {
  domain: string;
  count: number;
  percentage: number;
}

export interface LinkAnalytics {
  stats: ClickStats;
  timeSeries: TimeSeriesPoint[];
  geo: GeoStat[];
  devices: DeviceStat[];
  referrers: ReferrerStat[];
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface CreateLinkForm {
  destination: string;
  slug?: string;
  title?: string;
  description?: string;
  domainId?: string;
  tags?: string[];
  password?: string;
  expiresAt?: string;
  clickLimit?: number;
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
  geoRouting?: GeoRouting;
  abTestEnabled?: boolean;
  abTestVariants?: AbTestVariant[];
}

export type UpdateLinkForm = Partial<CreateLinkForm> & { isActive?: boolean };

// ─── Dodo Payments ───────────────────────────────────────────────────────────

export interface DodoCheckoutSession {
  id: string;
  url: string;
  status: "active" | "expired" | "complete";
  customerId?: string;
  planId: string;
}

export type DodoWebhookEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "subscription.trial_started";

export interface DodoWebhookEvent {
  id: string;
  type: DodoWebhookEventType;
  createdAt: string;
  data: {
    customerId?: string;
    subscriptionId?: string;
    planId?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
  };
}

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import type { GalleryLink, GalleryAppearance, PublishedSnapshot } from "@/types/gallery";
import type { Touchpoint } from "@/types/attribution";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", [
  "free",
  "starter",
  "growth",
  "agency",
  "business",
  "enterprise",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const deviceEnum = pgEnum("device_type", [
  "desktop",
  "mobile",
  "tablet",
  "bot",
  "unknown",
]);

export const cfHostnameStatusEnum = pgEnum("cf_hostname_status", [
  "pending",
  "active",
  "active_redeploying",
  "moved",
  "pending_deletion",
  "deleted",
  "pending_blocked",
  "pending_migration",
  "pending_provisioned",
  "test_pending",
  "test_active",
  "test_active_apex",
  "test_blocked",
  "test_failed",
  "provisioned",
  "blocked",
]);

export const cfSslStatusEnum = pgEnum("cf_ssl_status", [
  "initializing",
  "pending_validation",
  "pending_issuance",
  "pending_deployment",
  "pending_deletion",
  "pending_expiration",
  "expired",
  "active",
  "initializing_timed_out",
  "validation_timed_out",
  "issuance_timed_out",
  "deployment_timed_out",
  "deletion_timed_out",
  "pending_cleanup",
  "staging_deployment",
  "staging_active",
  "deactivating",
  "inactive",
  "backup_issued",
  "holding_deployment",
  "deleted",
]);

// ─── Custom-domain assignment (custom-domain-assignment spec) ──────────────────

/** What a verified custom domain is allowed to serve. Explicit admin intent. */
export const domainRoleEnum = pgEnum("domain_role", ["links", "bio", "both"]);

/** Operational gate, orthogonal to verification. */
export const domainStatusEnum = pgEnum("domain_status", [
  "active",
  "suspended_billing",
  "suspended_abuse",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** timestamptz columns with server-side defaults */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
};

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  avatar: text("avatar"),
  profileImageUrl: text("profile_image_url"),
  birthday: text("birthday"),
  gender: text("gender"),
  externalId: text("external_id"),
  primaryEmailAddressId: text("primary_email_address_id"),
  primaryPhoneNumberId: text("primary_phone_number_id"),
  primaryWeb3WalletId: text("primary_web3_wallet_id"),
  passwordEnabled: boolean("password_enabled"),
  twoFactorEnabled: boolean("two_factor_enabled"),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: "date" }),
  clerkCreatedAt: timestamp("clerk_created_at", { withTimezone: true, mode: "date" }),
  clerkUpdatedAt: timestamp("clerk_updated_at", { withTimezone: true, mode: "date" }),
  emailAddresses: jsonb("email_addresses"),
  phoneNumbers: jsonb("phone_numbers"),
  externalAccounts: jsonb("external_accounts"),
  web3Wallets: jsonb("web3_wallets"),
  publicMetadata: jsonb("public_metadata"),
  privateMetadata: jsonb("private_metadata"),
  unsafeMetadata: jsonb("unsafe_metadata"),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  ...timestamps,
});

// ─── workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clerkOrgId: text("clerk_org_id").unique(),
    clerkOrgName: text("clerk_org_name"),
    plan: planEnum("plan").notNull().default("free"),
    logo: text("logo"),
    customDomain: text("custom_domain").unique(),
    isDefault: boolean("is_default").notNull().default(false),
    /** Per-workspace toggle for the public visitor preview page (Req 13.3). */
    visitorPreviewEnabled: boolean("visitor_preview_enabled").notNull().default(true),
    dodoBillingCycleAnchor: timestamp('dodo_billing_cycle_anchor', { withTimezone: true }),
    dodoCustomerId: text('dodo_customer_id').unique(),
    planUpdatedAt: timestamp('plan_updated_at', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    // UTM templates - saved templates for this workspace
    utmTemplates: jsonb("utm_templates").$type<
      {
        id: string;
        name: string;
        source: string;
        medium: string;
        campaign: string;
        term: string;
        content: string;
        isDefault: boolean;
      }[]
    >().default(sql`'[]'::jsonb`),
    defaultUtmTemplateId: uuid("default_utm_template_id"),
    ...timestamps,
  },
  (t) => [
    index("workspaces_owner_idx").on(t.ownerId),
    index("workspaces_clerk_org_idx").on(t.clerkOrgId),
  ]
);

// ─── workspaceMembers ─────────────────────────────────────────────────────────

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    workspaceName: text("workspace_name"),
    role: memberRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("workspace_member_unique_idx").on(t.workspaceId, t.userId),
    index("workspace_members_user_idx").on(t.userId),
  ]
);

// ─── workspaceInvites ─────────────────────────────────────────────────────────

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull().default("viewer"),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" })
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("workspace_invite_email_workspace_idx").on(t.workspaceId, t.email),
    index("workspace_invites_token_idx").on(t.token),
    index("workspace_invites_workspace_idx").on(t.workspaceId),
  ]
);

// ─── domains ──────────────────────────────────────────────────────────────────

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    verified: boolean("verified").notNull().default(false),
    verificationToken: text("verification_token"),
    isDefault: boolean("is_default").notNull().default(false),

    cfHostnameId: text("cf_hostname_id").unique(),
    cfHostnameStatus: cfHostnameStatusEnum("cf_hostname_status"),
    cfSslStatus: cfSslStatusEnum("cf_ssl_status"),
    cfSslMethod: text("cf_ssl_method").default("http"),
    cfValidationRecords: jsonb("cf_validation_records").$type<
      Array<{
        cname?: string;
        cname_target?: string;
        emails?: string[];
        http_body?: string;
        http_url?: string;
        status?: string;
        txt_name?: string;
        txt_value?: string;
      }>
    >(),
    cfOwnershipVerification: jsonb("cf_ownership_verification").$type<{
      name?: string;
      type?: string;
      value?: string;
    }>(),
    cfOwnershipVerificationHttp: jsonb("cf_ownership_verification_http").$type<{
      http_body?: string;
      http_url?: string;
    }>(),
    cfVerificationErrors: jsonb("cf_verification_errors").$type<string[]>(),
    cfSslValidationErrors: jsonb("cf_ssl_validation_errors").$type<
      Array<{ message?: string }>
    >(),
    cfError: text("cf_error"),
    cfStatusUpdatedAt: timestamp("cf_status_updated_at", { withTimezone: true }),

    // ── Custom-domain assignment (custom-domain-assignment spec) ──────────────
    /** Explicit admin intent for what this domain serves. */
    role: domainRoleEnum("role").notNull().default("links"),
    /** Apex (one label before the public suffix) → needs CNAME-flattening/ALIAS guidance. */
    isApex: boolean("is_apex").notNull().default(false),
    /** For role=links domains: where the bare "/" path 302s when no bio is bound. */
    rootRedirectUrl: text("root_redirect_url"),
    /** Operational gate, orthogonal to verification. */
    status: domainStatusEnum("status").notNull().default("active"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),

    ...timestamps,
  },
  (t) => [index("domains_workspace_idx").on(t.workspaceId)]
);

// ─── workspaceTags ────────────────────────────────────────────────────────────

export const workspaceTags = pgTable(
  "workspace_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),           // lowercase-normalized
    color: text("color").notNull().default("#433BFF"),
    description: text("description"),
    usageCount: integer("usage_count").notNull().default(0), // denormalized counter
    ...timestamps,
  },
  (t) => [
    uniqueIndex("workspace_tags_ws_name_unique_idx").on(t.workspaceId, t.name),
    index("workspace_tags_workspace_idx").on(t.workspaceId),
  ]
);

// ─── folders ──────────────────────────────────────────────────────────────────

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#433BFF"),
    icon: text("icon").default("folder"),   // lucide icon name
    ...timestamps,
  },
  (t) => [
    index("folders_workspace_idx").on(t.workspaceId),
    index("folders_created_at_idx").on(t.createdAt),
  ]
);

// ─── links ────────────────────────────────────────────────────────────────────

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    domainId: uuid("domain_id").references(() => domains.id, {
      onDelete: "set null",
    }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),

    // Core
    slug: text("slug").notNull(),
    destination: text("destination").notNull(),
    title: text("title"),
    description: text("description"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),

    // Access control
    password: text("password"), // bcrypt hash
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
    clickLimit: integer("click_limit"),

    // Stats (denormalised counters — updated by DB trigger / cron)
    totalClicks: integer("total_clicks").notNull().default(0),
    uniqueClicks: integer("unique_clicks").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    // UTM params (carried through to destination)
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),

    // Social meta override
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),

    // Smart routing
    iosDestination: text("ios_destination"),
    androidDestination: text("android_destination"),

    // Deep linking
    uriScheme: text("uri_scheme"),
    iosAppStoreId: text("ios_app_store_id"),
    androidPlayStoreId: text("android_play_store_id"),
    iosBundleId: text("ios_bundle_id"),
    androidPackageName: text("android_package_name"),
    sha256CertFingerprints: text("sha256_cert_fingerprints").array().default(sql`'{}'::text[]`),
    universalLinksEnabled: boolean("universal_links_enabled").notNull().default(false),
    appLinksEnabled: boolean("app_links_enabled").notNull().default(false),

    // Geo routing: { "US": "https://...", "GB": "https://..." }
    geoRouting: jsonb("geo_routing").$type<Record<string, string>>(),

    // Smart routing rules — condition can set device, country, and/or language
    routingRules: jsonb("routing_rules").$type<
      {
        condition: {
          device?: "mobile" | "desktop" | "tablet";
          country?: string;
          language?: string;
        };
        destination: string;
      }[]
    >().default(sql`'[]'::jsonb`),

    // A/B testing
    abTestEnabled: boolean("ab_test_enabled").notNull().default(false),
    abTestVariants: jsonb("ab_test_variants").$type<
      { id: string; destination: string; weight: number; label: string; clicks: number; conversions: number; conversionRate: number; uniqueClicks: number }[]
    >().default(sql`'[]'::jsonb`),
    abTestWinner: text("ab_test_winner"),
    abTestSignificance: numeric("ab_test_significance", { precision: 5, scale: 4 }),
    abTestStartedAt: timestamp("ab_test_started_at", { withTimezone: true, mode: "date" }),
    abTestEndedAt: timestamp("ab_test_ended_at", { withTimezone: true, mode: "date" }),
    abTestDurationDays: integer("ab_test_duration_days").default(14),
    abTestMinSampleSize: integer("ab_test_min_sample_size").default(100),
    abTestConfidenceLevel: numeric("ab_test_confidence_level", { precision: 3, scale: 2 }).default("0.95"),
    abTestAutoSelectWinner: boolean("ab_test_auto_select_winner").default(true),

    // QR customization — stored as JSONB, falls back to DEFAULT_QR_SETTINGS
    qrSettings: jsonb("qr_settings")
      .$type<QRSettings>()
      .default(DEFAULT_QR_SETTINGS),

    // ─── Safety / URL Scanner ─────────────────────────────────────────────
    // Cloudflare URL Scanner verdict for the destination. Updated:
    //   - on link create (auto-scan, async)
    //   - on manual rescan from /dashboard/link-safety
    //   - on scheduled rescans (cron, future)
    // `pending`     scan submitted, no verdict yet
    // `safe`        Cloudflare returned overall.malicious = false
    // `malicious`   overall.malicious = true → /s/[slug] blocks with interstitial
    // `suspicious`  unused for now; reserved for heuristic-based flags
    // `error`       scan failed (DNS, timeout, API error)
    // `unknown`     never scanned (legacy rows / scanner disabled)
    safetyStatus: text("safety_status", {
      enum: ["unknown", "pending", "safe", "suspicious", "malicious", "error"],
    })
      .notNull()
      .default("unknown"),
    safetyScanId: text("safety_scan_id"),       // Cloudflare scan UUID
    safetyScannedAt: timestamp("safety_scanned_at", { withTimezone: true, mode: "date" }),
    safetyVerdict: jsonb("safety_verdict").$type<{
      malicious: boolean;
      categories?: string[];
      phishing?: string[];
      domain?: string;
      country?: string;
      asn?: string;
      asnName?: string;
      technologies?: { name: string; categories?: string[] }[];
    }>(),
    // When set, even a `safe` link is administratively blocked (used by
    // owners to take a link offline without deleting it).
    safetyBlockedByAdmin: boolean("safety_blocked_by_admin")
      .notNull()
      .default(false),
    // Trust Score / Trust Band — see Trust_Score_Engine. The score is the
    // numeric [0,100] value, the band is its label, and `weightVersion`
    // tells us which scoring weight table the score was computed under
    // so we know when to recompute on read.
    safetyTrustScore: integer("safety_trust_score"),
    safetyTrustBand: text("safety_trust_band", {
      enum: ["unknown", "low", "medium", "high", "verified"],
    })
      .notNull()
      .default("unknown"),
    safetyWeightVersion: integer("safety_weight_version"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("links_domain_slug_unique_idx").on(t.domainId, t.slug),
    index("links_workspace_idx").on(t.workspaceId),
    index("links_slug_idx").on(t.slug),
    index("links_created_at_idx").on(t.createdAt),
    index("links_user_idx").on(t.userId),
    // Speeds up the Link Safety dashboard which lists malicious / pending /
    // suspicious links per workspace. Most rows will be `safe` so we keep
    // the index narrow with a workspace partition.
    index("links_safety_status_idx").on(t.workspaceId, t.safetyStatus),
  ]
);

// ─── scan_reports ─────────────────────────────────────────────────────────────
// Full historical Cloudflare URL Scanner reports. One row per scan per link.
// The latest report drives the link's denormalized safety_* columns.

export const scanReports = pgTable(
  "scan_reports",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scanId: text("scan_id").notNull(),
    status: text("status", {
      enum: ["pending", "finished", "failed", "error"],
    }).notNull().default("pending"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),

    // Verdict
    malicious: boolean("malicious"),
    phishingKit: text("phishing_kit"),

    // Page primary response
    pageUrl: text("page_url"),
    pageIp: text("page_ip"),
    pageAsn: text("page_asn"),
    pageAsnName: text("page_asn_name"),
    pageCountry: text("page_country"),
    pageServer: text("page_server"),

    // Hashes & rank
    domStructHash: text("dom_struct_hash"),
    screenshotHash: text("screenshot_hash"),
    faviconHash: text("favicon_hash"),
    radarRank: integer("radar_rank"),

    // Trust score
    trustScore: integer("trust_score"),
    trustBand: text("trust_band", {
      enum: ["unknown", "low", "medium", "high", "verified"],
    }),
    weightVersion: integer("weight_version"),

    // Lists & meta
    redirectChain: jsonb("redirect_chain").$type<
      { url: string; status: number; ip?: string; country?: string }[]
    >().default(sql`'[]'::jsonb`),
    categories: jsonb("categories").$type<string[]>().default(sql`'[]'::jsonb`),
    technologies: jsonb("technologies").$type<
      { name: string; categories?: string[]; version?: string; confidence?: number }[]
    >().default(sql`'[]'::jsonb`),
    contactedIps: jsonb("contacted_ips").$type<string[]>().default(sql`'[]'::jsonb`),
    contactedAsns: jsonb("contacted_asns").$type<{ asn: string; name?: string }[]>().default(sql`'[]'::jsonb`),
    contactedDomains: jsonb("contacted_domains").$type<string[]>().default(sql`'[]'::jsonb`),
    certificates: jsonb("certificates").$type<
      { issuer: string; subject: string; validFrom: string; validTo: string }[]
    >().default(sql`'[]'::jsonb`),
    performance: jsonb("performance").$type<{
      ttfbMs?: number;
      fcpMs?: number;
      loadMs?: number;
    }>(),
    cookiesSummary: jsonb("cookies_summary").$type<{
      total: number;
      thirdParty: number;
      domains: string[];
    }>(),
    globalsSummary: jsonb("globals_summary").$type<{
      total: number;
      suspicious: string[];
    }>(),
    consoleSummary: jsonb("console_summary").$type<{
      errors: number;
      warnings: number;
    }>(),

    // Compact HAR summary — third-party domains, resource type counts,
    // total requests, total transfer bytes, page load time.
    // The full HAR is fetched on-demand via GET /api/url-scanner/har/[scanId].
    harSummary: jsonb("har_summary").$type<{
      thirdPartyDomains: string[];
      resourceTypes: Record<string, number>;
      totalRequests: number;
      totalTransferBytes: number;
      pageLoadMs: number | null;
    }>(),

    // DOM analysis — hidden iframes, obfuscated scripts, external form
    // actions, crypto wallet patterns, etc. Derived from the rendered DOM
    // fetched via GET /v2/dom/{scan_id}.
    domAnalysis: jsonb("dom_analysis").$type<{
      hiddenIframes: number;
      passwordInputs: number;
      obfuscatedScripts: number;
      metaRedirects: number;
      externalFormActions: string[];
      cryptoAddressPatterns: number;
      suspicious: boolean;
    }>(),

    // Raw payload for forward-compat / re-derivation
    rawPayload: jsonb("raw_payload"),

    // Bookkeeping
    schemaVersion: integer("schema_version").notNull().default(1),
    rescanReason: text("rescan_reason"),
    validationError: text("validation_error"),
    screenshotUnavailable: boolean("screenshot_unavailable").notNull().default(false),
    similarToMalicious: jsonb("similar_to_malicious").$type<{
      url: string;
      matches: string[];
    } | null>(),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("scan_reports_link_idx").on(t.linkId, t.fetchedAt),
    index("scan_reports_workspace_idx").on(t.workspaceId, t.fetchedAt),
    uniqueIndex("scan_reports_scan_id_uidx").on(t.scanId),
  ]
);

// ─── asset_risk_flags ────────────────────────────────────────────────────────
// Typed warnings emitted by the Asset_Risk_Analyzer for a given scan.

export const assetRiskFlags = pgTable(
  "asset_risk_flags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scanReports.id, { onDelete: "cascade" }),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "crypto_miner",
        "fingerprinter",
        "excessive_third_party_cookies",
        "suspicious_global",
        "console_error_burst",
        "expired_certificate",
        "long_redirect_chain",
        "similar_to_malicious",
      ],
    }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("asset_risk_flags_scan_idx").on(t.scanId),
    index("asset_risk_flags_link_idx").on(t.linkId),
    index("asset_risk_flags_kind_idx").on(t.kind),
  ]
);

// ─── scan_screenshots ────────────────────────────────────────────────────────
// Cloudflare URL Scanner screenshot bytes, stored losslessly as raw `bytea`
// (no base64 inflation, no re-encoding). One row per (scan_id, resolution).

import { customType } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const scanScreenshots = pgTable(
  "scan_screenshots",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    scanReportId: uuid("scan_report_id")
      .notNull()
      .references(() => scanReports.id, { onDelete: "cascade" }),
    scanId: text("scan_id").notNull(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    resolution: text("resolution", {
      enum: ["desktop", "mobile", "tablet"],
    }).notNull().default("desktop"),
    mimeType: text("mime_type").notNull().default("image/png"),
    bytes: bytea("bytes"),
    r2Key: text("r2_key"),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("scan_screenshots_scan_resolution_uidx").on(t.scanId, t.resolution),
    index("scan_screenshots_link_idx").on(t.linkId),
    index("scan_screenshots_workspace_idx").on(t.workspaceId),
    index("scan_screenshots_fetched_idx").on(t.fetchedAt),
  ]
);

// ─── safety_purge_requests ────────────────────────────────────────────────────
// Right-To-Be-Forgotten queue (Req 21). Workspace operators submit a purge
// request for a deleted link; a daily cron executes the actual deletion once
// `purge_after` has elapsed (within 7 days per Req 21.3).

export const safetyPurgeRequests = pgTable(
  "safety_purge_requests",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** The link id — stored as text because the link row may already be deleted. */
    linkId: text("link_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    requestedBy: text("requested_by").notNull(),
    purgeAfter: timestamp("purge_after", { withTimezone: true, mode: "date" }).notNull(),
    purgedAt: timestamp("purged_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("spr_workspace_idx").on(t.workspaceId),
    index("spr_purge_after_idx").on(t.purgeAfter),
  ]
);

// ─── clicks ───────────────────────────────────────────────────────────────────
// Designed to hold billions of rows — all high-cardinality indexes kept tight.

export const clicks = pgTable(
  "clicks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Privacy: store SHA-256 of (ip + salt), never raw IP
    ip: text("ip"),

    // Geo
    country: text("country"),   // ISO 3166-1 alpha-2
    city: text("city"),
    region: text("region"),
    language: text("language"), // BCP 47 tag, e.g. "en-US"

    // Device
    device: deviceEnum("device").notNull().default("unknown"),
    browser: text("browser"),
    os: text("os"),

    // Traffic source
    referrer: text("referrer"),
    referrerDomain: text("referrer_domain"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),

    // QR scan tracking — true when ?source=qr is detected
    isQrScan: boolean("is_qr_scan").notNull().default(false),

    // Deep link — true when a URI scheme / app link was resolved
    isDeepLink: boolean("is_deep_link").notNull().default(false),

    // A/B
    abVariant: text("ab_variant"),
    abTestId: uuid("ab_test_id"),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("clicks_link_id_idx").on(t.linkId),
    index("clicks_workspace_idx").on(t.workspaceId),
    index("clicks_created_at_idx").on(t.createdAt),
    index("clicks_country_idx").on(t.country),
    index("clicks_referrer_domain_idx").on(t.referrerDomain),
  ]
);

// ─── ab_test_results ──────────────────────────────────────────────────────────

export const abTestResults = pgTable(
  "ab_test_results",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    variantDestination: text("variant_destination").notNull(),
    clicks: integer("clicks").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    conversionRate: numeric("conversion_rate", { precision: 5, scale: 4 }).default("0"),
    uniqueClicks: integer("unique_clicks").notNull().default(0),
    ctaScore: numeric("cta_score", { precision: 6, scale: 4 }).default("0"),
    isWinner: boolean("is_winner").default(false),
    significanceLevel: numeric("significance_level", { precision: 5, scale: 4 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" }).defaultNow(),
  },
  (t) => [
    index("ab_test_results_link_id_idx").on(t.linkId),
    index("ab_test_results_workspace_idx").on(t.workspaceId),
  ]
);

// ─── conversions ──────────────────────────────────────────────────────────────

export const conversions = pgTable(
  "conversions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    event: text("event").notNull(), // 'signup', 'purchase', 'trial_start', …
    value: numeric("value", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    abVariant: text("ab_variant"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("conversions_link_id_idx").on(t.linkId),
    index("conversions_workspace_idx").on(t.workspaceId),
    index("conversions_created_at_idx").on(t.createdAt),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
  links: many(links),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  domains: many(domains),
  links: many(links),
  clicks: many(clicks),
  conversions: many(conversions),
  folders: many(folders),
  workspaceTags: many(workspaceTags),
  customerJourneys: many(customerJourneys),
  attributionResults: many(attributionResults),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

export const domainsRelations = relations(domains, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [domains.workspaceId],
    references: [workspaces.id],
  }),
  links: many(links),
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [links.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, { fields: [links.userId], references: [users.id] }),
  domain: one(domains, { fields: [links.domainId], references: [domains.id] }),
  folder: one(folders, { fields: [links.folderId], references: [folders.id] }),
  clicks: many(clicks),
  conversions: many(conversions),
  attributionResults: many(attributionResults),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [folders.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [folders.userId], references: [users.id] }),
  links: many(links),
}));

export const workspaceTagsRelations = relations(workspaceTags, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceTags.workspaceId], references: [workspaces.id] }),
}));

export const clicksRelations = relations(clicks, ({ one }) => ({
  link: one(links, { fields: [clicks.linkId], references: [links.id] }),
  workspace: one(workspaces, {
    fields: [clicks.workspaceId],
    references: [workspaces.id],
  }),
}));

export const conversionsRelations = relations(conversions, ({ one }) => ({
  link: one(links, { fields: [conversions.linkId], references: [links.id] }),
  workspace: one(workspaces, {
    fields: [conversions.workspaceId],
    references: [workspaces.id],
  }),
}));

// ��� usage_counters (monthly) ���������������������������������������������������
// Tracks per-workspace monthly usage for billing enforcement & UX.
// month_start uses the first day of the month in UTC (e.g., 2026-05-01 00:00:00Z).
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    monthStart: timestamp("month_start", { withTimezone: true, mode: "date" })
      .notNull(),
    // Aggregated counters for the month
    linksCreated: integer("links_created").notNull().default(0),
    domainsCreated: integer("domains_created").notNull().default(0),
    apiCalls: integer("api_calls").notNull().default(0),
    clicksTracked: integer("clicks_tracked").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("usage_counters_workspace_month_unique_idx").on(
      t.workspaceId,
      t.monthStart
    ),
    index("usage_counters_workspace_idx").on(t.workspaceId),
    index("usage_counters_month_idx").on(t.monthStart),
  ]
);

export const userMessages = pgTable("user_messages", {
  userId: text("user_id").primaryKey().notNull(),
  createTs: timestamp("create_ts").defaultNow().notNull(),
  message: text("message").notNull(),
});

// ─── link_gallery ─────────────────────────────────────────────────────────────
// Stores a user's link-in-bio page configuration

export const linkGallery = pgTable(
  "link_gallery",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customDomainId: uuid("custom_domain_id").references(() => domains.id, {
      onDelete: "set null",
    }),

    // Page identity
    slug: text("slug").notNull().unique(),
    isPublished: boolean("is_published").notNull().default(false),
    // Custom-domain assignment: when bound to a custom domain and marked root,
    // this bio is served at the domain root ("/"). Reserved for future
    // path-scoped multi-bio; unused by v1 routing beyond the root case.
    isRootPage: boolean("is_root_page").notNull().default(false),

    // ── Draft / Publish snapshot ────────────────────────────────────────────
    // The other columns on this row are the *draft* (what's shown in /edit
    // and overwritten by autosave). `publishedSnapshot` is what /p/[slug]
    // serves to the public — frozen at the moment the user clicks
    // "Publish" or "Update content". `null` when never published.
    publishedSnapshot: jsonb("published_snapshot")
      .$type<PublishedSnapshot | null>()
      .default(sql`null`),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),

    // Profile
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    avatarInitials: text("avatar_initials"),
    avatarBgColor: text("avatar_bg_color").notNull().default("#6366f1"),

    // Links array stored as JSONB
    links: jsonb("links").$type<GalleryLink[]>().notNull().default(sql`'[]'::jsonb`),

    // Appearance config stored as JSONB
    appearance: jsonb("appearance").$type<GalleryAppearance>(),

    // Grid layout (react-grid-layout config arrays)
    layout: jsonb("layout").$type<Record<string, unknown>[]>(),
    mobileLayout: jsonb("mobile_layout").$type<Record<string, unknown>[]>(),

    // Theme
    themeId: uuid("theme_id"),

    // SEO
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),

    // Branding
    showBranding: boolean("show_branding").notNull().default(true),

    // NOTE: totalClicks is intentionally NOT stored here.
    // Compute on read: SELECT COUNT(*) FROM link_gallery_clicks WHERE gallery_id = ?
    // This avoids drift from failed inserts, crashes, or GDPR deletions.

    ...timestamps,
  },
  (t) => [
    uniqueIndex("link_gallery_slug_idx").on(t.slug),
    index("link_gallery_user_idx").on(t.userId),
    index("link_gallery_workspace_idx").on(t.workspaceId),
    // At most one bio bound per custom domain (v1: that bio is the root).
    uniqueIndex("link_gallery_custom_domain_uidx")
      .on(t.customDomainId)
      .where(sql`custom_domain_id IS NOT NULL`),
  ]
);

// ─── link_gallery_clicks ──────────────────────────────────────────────────────

export const linkGalleryClicks = pgTable(
  "link_gallery_clicks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => linkGallery.id, { onDelete: "cascade" }),
    linkIndex: integer("link_index").notNull(),
    ip: text("ip"),
    country: text("country"),
    device: deviceEnum("device").notNull().default("unknown"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("lgc_gallery_idx").on(t.galleryId),
    index("lgc_created_at_idx").on(t.createdAt),
  ]
);

// ─── Relations (gallery) ──────────────────────────────────────────────────────

export const linkGalleryRelations = relations(linkGallery, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [linkGallery.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [linkGallery.userId],
    references: [users.id],
  }),
  customDomain: one(domains, {
    fields: [linkGallery.customDomainId],
    references: [domains.id],
  }),
  clicks: many(linkGalleryClicks),
}));

export const linkGalleryClicksRelations = relations(linkGalleryClicks, ({ one }) => ({
  gallery: one(linkGallery, {
    fields: [linkGalleryClicks.galleryId],
    references: [linkGallery.id],
  }),
}));

// ─── subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  dodoSubscriptionId: text('dodo_subscription_id').unique(),
  dodoCustomerId: text('dodo_customer_id'),
  plan: planEnum('plan').notNull().default('free'),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'annual'] })
    .notNull().default('monthly'),
  status: text('status', {
    enum: ['active','past_due','cancelled','trialing','paused','incomplete']
  }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('subscriptions_workspace_idx').on(t.workspaceId),
  index('subscriptions_dodo_id_idx').on(t.dodoSubscriptionId)
]);

// ─── usage_overrides ──────────────────────────────────────────────────────────
// This table lets you give individual workspaces custom limits
// e.g. give a key customer 10,000 links/mo even on Free plan
export const usageOverrides = pgTable('usage_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().unique()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  linksPerMonth: integer('links_per_month'),         // null = use plan default
  clicksTrackedPerMonth: integer('clicks_tracked_per_month'),
  customDomains: integer('custom_domains'),
  teamMembers: integer('team_members'),
  apiCallsPerHour: integer('api_calls_per_hour'),
  abTestingEnabled: boolean('ab_testing_enabled'),   // null = use plan default
  whiteLabelEnabled: boolean('white_label_enabled'),
  bioPages: integer('bio_pages'),
  analyticsRetentionDays: integer('analytics_retention_days'),
  reason: text('reason'), // internal note e.g. "enterprise deal - negotiated"
  expiresAt: timestamp('expires_at', { withTimezone: true }), // null = permanent
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedBy: text('updated_by'), // admin user ID who set this override
});

// ─── waitlist ─────────────────────────────────────────────────────────────────
// Stores email signups for beta features with gamification

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    feature: text("feature").notNull(),
    points: integer("points").notNull().default(50),
    referralCode: text("referral_code").notNull().unique(),
    referredBy: text("referred_by"),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("waitlist_email_feature_unique_idx").on(t.email, t.feature),
    uniqueIndex("waitlist_referral_code_idx").on(t.referralCode),
    index("waitlist_feature_idx").on(t.feature),
  ]
);

// ─── api_keys ─────────────────────────────────────────────────────────────────
// Developer API keys for programmatic access. Only prefix+hash stored — full key shown once.

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    keyType: text("key_type", { enum: ["secret", "publishable"] }).notNull().default("secret"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("api_keys_key_hash_unique_idx").on(t.keyHash),
    index("api_keys_workspace_idx").on(t.workspaceId),
  ]
);

// ─── billing_events ───────────────────────────────────────────────────────────
export const billingEvents = pgTable('billing_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .references(() => workspaces.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  // e.g. 'payment.succeeded','subscription.cancelled','plan.upgraded'
  fromPlan: planEnum('from_plan'),
  toPlan: planEnum('to_plan'),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  dodoEventId: text('dodo_event_id').unique(), // for deduplication
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('billing_events_workspace_idx').on(t.workspaceId),
  index('billing_events_dodo_id_idx').on(t.dodoEventId)
]);

// ─── customer_journeys (multi-touch attribution) ──────────────────────────────
export const customerJourneys = pgTable(
  "customer_journeys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    customerId: text("customer_id"),
    customerEmail: text("customer_email"),
    touchpoints: jsonb("touchpoints").$type<Touchpoint[]>().default([]),
    firstTouchLinkId: uuid("first_touch_link_id"),
    lastTouchLinkId: uuid("last_touch_link_id"),
    converted: boolean("converted").default(false),
    conversionValue: numeric("conversion_value", { precision: 10, scale: 2 }),
    conversionEvent: text("conversion_event"),
    conversionAt: timestamp("conversion_at", { withTimezone: true, mode: "date" }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true, mode: "date" })
      .default(sql`now()`),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" })
      .default(sql`now()`),
    totalTouchpoints: integer("total_touchpoints").default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`now()`),
  },
  (t) => [
    index("customer_journeys_workspace_idx").on(t.workspaceId),
    index("customer_journeys_session_idx").on(t.sessionId),
    index("customer_journeys_converted_idx").on(t.converted),
  ]
);

export const attributionResults = pgTable(
  "attribution_results",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id")
      .references(() => customerJourneys.id, { onDelete: "cascade" }),
    linkId: uuid("link_id")
      .references(() => links.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    credit: numeric("credit", { precision: 5, scale: 4 }).notNull(),
    creditValue: numeric("credit_value", { precision: 10, scale: 2 }),
    calculatedAt: timestamp("calculated_at", { withTimezone: true, mode: "date" })
      .default(sql`now()`),
  },
  (t) => [
    index("attribution_results_workspace_idx").on(t.workspaceId),
    index("attribution_results_journey_idx").on(t.journeyId),
    index("attribution_results_link_idx").on(t.linkId),
    index("attribution_results_model_idx").on(t.model),
  ]
);

export const customerJourneysRelations = relations(customerJourneys, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [customerJourneys.workspaceId],
    references: [workspaces.id],
  }),
  attributionResults: many(attributionResults),
}));

export const attributionResultsRelations = relations(attributionResults, ({ one }) => ({
  journey: one(customerJourneys, {
    fields: [attributionResults.journeyId],
    references: [customerJourneys.id],
  }),
  link: one(links, {
    fields: [attributionResults.linkId],
    references: [links.id],
  }),
  workspace: one(workspaces, {
    fields: [attributionResults.workspaceId],
    references: [workspaces.id],
  }),
}));

// ─── webhook_failed_events (dead-letter queue) ─────────────────────────────────
export const webhookFailedEvents = pgTable(
  "webhook_failed_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    error: text("error").notNull(),
    attempts: integer("attempts").notNull().default(1),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("webhook_failed_events_resolved_idx").on(t.resolvedAt),
  ]
);

// ─── audit_logs ────────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("audit_logs_workspace_idx").on(t.workspaceId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ]
);

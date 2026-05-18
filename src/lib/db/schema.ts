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
import type { GalleryLink, GalleryAppearance } from "@/types/gallery";

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
    plan: planEnum("plan").notNull().default("free"),
    logo: text("logo"),
    customDomain: text("custom_domain").unique(),
    isDefault: boolean("is_default").notNull().default(false),
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
  (t) => [index("workspaces_owner_idx").on(t.ownerId)]
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
    ...timestamps,
  },
  (t) => [index("domains_workspace_idx").on(t.workspaceId)]
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

    // Core
    slug: text("slug").notNull(),
    destination: text("destination").notNull(),
    title: text("title"),
    description: text("description"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),

    // Access control
    password: text("password"), // bcrypt hash
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
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

    // Geo routing: { "US": "https://...", "GB": "https://..." }
    geoRouting: jsonb("geo_routing").$type<Record<string, string>>(),

    // Smart routing rules - array of conditional redirects
    routingRules: jsonb("routing_rules").$type<
      {
        id: string;
        condition: {
          type: "device" | "country" | "language";
          value: string;
        };
        destination: string;
      }[]
    >().default(sql`'[]'::jsonb`),

    // A/B testing
    abTestEnabled: boolean("ab_test_enabled").notNull().default(false),
    abTestVariants: jsonb("ab_test_variants").$type<
      { destination: string; weight: number; clicks: number }[]
    >(),

    // QR customization — stored as JSONB, falls back to DEFAULT_QR_SETTINGS
    qrSettings: jsonb("qr_settings")
      .$type<QRSettings>()
      .default(DEFAULT_QR_SETTINGS),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("links_domain_slug_unique_idx").on(t.domainId, t.slug),
    index("links_workspace_idx").on(t.workspaceId),
    index("links_slug_idx").on(t.slug),
    index("links_created_at_idx").on(t.createdAt),
    index("links_user_idx").on(t.userId),
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

    // A/B
    abVariant: text("ab_variant"),

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
  clicks: many(clicks),
  conversions: many(conversions),
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

// ─── usage_counters (monthly) ───────────────────────────────────────────────────
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

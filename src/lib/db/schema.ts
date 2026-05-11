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
  avatar: text("avatar"),
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

    // A/B testing
    abTestEnabled: boolean("ab_test_enabled").notNull().default(false),
    abTestVariants: jsonb("ab_test_variants").$type<
      { destination: string; weight: number; clicks: number }[]
    >(),

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

export const userMessages = pgTable("user_messages", {
  userId: text("user_id").primaryKey().notNull(),
  createTs: timestamp("create_ts").defaultNow().notNull(),
  message: text("message").notNull(),
});

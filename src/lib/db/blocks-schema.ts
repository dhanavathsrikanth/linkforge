import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { linkGallery, workspaces } from "./schema";

// ─── Assets Table (stores uploaded images in Neon DB instead of S3) ────────────
// Size limit: ~1MB per image (base64 encoded), recommended <500KB per image

export const linkGalleryAssets = pgTable(
  "link_gallery_assets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => linkGallery.id, { onDelete: "cascade" }),
    blockId: uuid("block_id"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    data: text("data").notNull(), // base64 encoded image
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
  },
  (t) => [
    index("lga_gallery_idx").on(t.galleryId),
    index("lga_block_idx").on(t.blockId),
    index("lga_filename_idx").on(t.filename),
  ]
);

export const linkGalleryAssetsRelations = relations(linkGalleryAssets, ({ one }) => ({
  gallery: one(linkGallery, {
    fields: [linkGalleryAssets.galleryId],
    references: [linkGallery.id],
  }),
}));

// ─── bio_themes ──────────────────────────────────────────────────────────────

export const bioThemes = pgTable(
  "bio_themes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull().default(""),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    isDefault: boolean("is_default").notNull().default(false),
    createdById: text("created_by_id").notNull(),
    colorBgBase: jsonb("color_bg_base").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorBgPrimary: jsonb("color_bg_primary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorBgSecondary: jsonb("color_bg_secondary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorBorderPrimary: jsonb("color_border_primary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorTitlePrimary: jsonb("color_title_primary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorTitleSecondary: jsonb("color_title_secondary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorLabelPrimary: jsonb("color_label_primary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorLabelSecondary: jsonb("color_label_secondary").$type<{ h: number; s: number; l: number; a?: number }>(),
    colorLabelTertiary: jsonb("color_label_tertiary").$type<{ h: number; s: number; l: number; a?: number }>(),
    font: text("font"),
    backgroundImage: text("background_image"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
  },
  (t) => [
    index("bt_workspace_idx").on(t.workspaceId),
    index("bt_default_idx").on(t.isDefault),
  ]
);

// ─── Block Type Enum ─────────────────────────────────────────────────────────

export const blockTypeEnum = pgEnum("block_type", [
  "header",
  "link-bar",
  "link-box",
  "content",
  "image",
  "reaction",
  "youtube",
  "spotify-embed",
  "spotify-playing-now",
  "tiktok-latest-post",
  "tiktok-follower-count",
  "instagram-latest-post",
  "instagram-follower-count",
  "threads-follower-count",
  "github-commits-this-month",
  "stack",
  "map",
  "waitlist-email",
]);

// ─── link_gallery_blocks ─────────────────────────────────────────────────────

export const linkGalleryBlocks = pgTable(
  "link_gallery_blocks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => linkGallery.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    integrationId: uuid("integration_id"),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
  },
  (t) => [
    index("lgb_gallery_idx").on(t.galleryId),
    index("lgb_sort_order_idx").on(t.galleryId, t.sortOrder),
    index("lgb_type_idx").on(t.type),
  ]
);

// ─── link_gallery_integrations ───────────────────────────────────────────────

export const linkGalleryIntegrations = pgTable(
  "link_gallery_integrations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => linkGallery.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    displayName: text("display_name"),
    encryptedConfig: text("encrypted_config"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
  },
  (t) => [
    index("lgi_gallery_idx").on(t.galleryId),
    index("lgi_type_idx").on(t.type),
  ]
);

// ─── link_gallery_block_events (unified interaction tracking) ─────────────────

export const linkGalleryBlockEvents = pgTable(
  "link_gallery_block_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => linkGallery.id, { onDelete: "cascade" }),
    blockId: uuid("block_id")
      .notNull()
      .references(() => linkGalleryBlocks.id, { onDelete: "cascade" }),
    blockType: text("block_type").notNull(),
    eventType: text("event_type", { enum: ["click", "reaction", "submission", "view"] }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    ip: text("ip"),
    country: text("country"),
    device: text("device"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
  },
  (t) => [
    index("lgbe_gallery_idx").on(t.galleryId),
    index("lgbe_block_idx").on(t.blockId),
    index("lgbe_type_idx").on(t.blockType, t.eventType),
    index("lgbe_created_at_idx").on(t.createdAt),
  ]
);

// ─── link_gallery_reactions ──────────────────────────────────────────────────

export const linkGalleryReactions = pgTable(
  "link_gallery_reactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => linkGallery.id, { onDelete: "cascade" }),
    blockId: uuid("block_id").references(() => linkGalleryBlocks.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`),
  },
  (t) => [
    index("lgr_gallery_idx").on(t.galleryId),
    index("lgr_block_idx").on(t.blockId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const linkGalleryBlocksRelations = relations(linkGalleryBlocks, ({ one }) => ({
  gallery: one(linkGallery, {
    fields: [linkGalleryBlocks.galleryId],
    references: [linkGallery.id],
  }),
}));

export const linkGalleryIntegrationsRelations = relations(linkGalleryIntegrations, ({ one, many }) => ({
  gallery: one(linkGallery, {
    fields: [linkGalleryIntegrations.galleryId],
    references: [linkGallery.id],
  }),
  blocks: many(linkGalleryBlocks),
}));

export const linkGalleryReactionsRelations = relations(linkGalleryReactions, ({ one }) => ({
  gallery: one(linkGallery, {
    fields: [linkGalleryReactions.galleryId],
    references: [linkGallery.id],
  }),
  block: one(linkGalleryBlocks, {
    fields: [linkGalleryReactions.blockId],
    references: [linkGalleryBlocks.id],
  }),
}));

export const linkGalleryBlockEventsRelations = relations(linkGalleryBlockEvents, ({ one }) => ({
  gallery: one(linkGallery, {
    fields: [linkGalleryBlockEvents.galleryId],
    references: [linkGallery.id],
  }),
  block: one(linkGalleryBlocks, {
    fields: [linkGalleryBlockEvents.blockId],
    references: [linkGalleryBlocks.id],
  }),
}));
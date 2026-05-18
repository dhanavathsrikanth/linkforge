import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

// Re-export all tables and enums for convenience
export {
  // Tables
  users,
  workspaces,
  workspaceMembers,
  domains,
  links,
  clicks,
  conversions,
  userMessages,
  linkGallery,
  linkGalleryClicks,
  usageCounters,
  // Enums
  planEnum,
  memberRoleEnum,
  deviceEnum,
  // Relations
  usersRelations,
  workspacesRelations,
  workspaceMembersRelations,
  domainsRelations,
  linksRelations,
  clicksRelations,
  conversionsRelations,
  linkGalleryRelations,
  linkGalleryClicksRelations,
  subscriptions,
  usageOverrides,
  billingEvents,
} from "./schema";

export type Subscription = typeof schema.subscriptions.$inferSelect;
export type UsageOverride = typeof schema.usageOverrides.$inferSelect;
export type BillingEvent = typeof schema.billingEvents.$inferSelect;
export type Plan = typeof schema.planEnum.enumValues[number];

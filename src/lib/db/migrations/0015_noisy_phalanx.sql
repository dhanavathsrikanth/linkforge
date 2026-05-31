-- custom-domain-assignment spec — Task 1: additive schema for domain roles,
-- status/suspension, apex/root-redirect, bio root flag, and one-bio-per-domain.
--
-- NOTE: This file was hand-trimmed from the drizzle-kit output. The generated
-- diff also tried to (re)create scan_reports, scan_screenshots, asset_risk_flags,
-- bio_themes and several safety_*/link_gallery columns that ALREADY EXIST in the
-- running database (a pre-existing snapshot/journal drift from earlier db:push
-- usage). Those statements were intentionally removed so this migration only
-- applies the custom-domain-assignment changes. All statements below are
-- idempotent so the file is safe to run regardless of current DB state.

-- Enums (guarded — CREATE TYPE has no IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE "public"."domain_role" AS ENUM('links', 'bio', 'both');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."domain_status" AS ENUM('active', 'suspended_billing', 'suspended_abuse');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- domains: role / apex / root-redirect / status / suspension
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "role" "domain_role" DEFAULT 'links' NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "is_apex" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "root_redirect_url" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "status" "domain_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "suspended_reason" text;--> statement-breakpoint

-- link_gallery: root-page flag + one-bio-per-domain partial unique index
ALTER TABLE "link_gallery" ADD COLUMN IF NOT EXISTS "is_root_page" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_gallery_custom_domain_uidx" ON "link_gallery" USING btree ("custom_domain_id") WHERE custom_domain_id IS NOT NULL;

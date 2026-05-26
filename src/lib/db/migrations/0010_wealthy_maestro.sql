CREATE TYPE "public"."cf_hostname_status" AS ENUM('pending', 'active', 'active_redeploying', 'blocked', 'moved', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."cf_ssl_status" AS ENUM('pending_validation', 'pending_issuance', 'active', 'deleted');--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_hostname_id" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_hostname_status" "cf_hostname_status";--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_ssl_status" "cf_ssl_status";--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_ssl_method" text DEFAULT 'http';--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_validation_records" jsonb;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_error" text;--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "cf_status_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_cf_hostname_id_unique" UNIQUE("cf_hostname_id");
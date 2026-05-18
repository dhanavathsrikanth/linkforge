-- Migration 0003: Rebuild billing tables that were left as empty shells
-- These tables (subscriptions, usage_overrides, billing_events) were
-- dropped and partially recreated during a failed migration attempt.
-- This migration drops the empty shells and recreates them fully.

-- Drop empty shells
DROP TABLE IF EXISTS "subscriptions" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "usage_overrides" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "billing_events" CASCADE;
--> statement-breakpoint

-- Recreate billing_events
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"event_type" text NOT NULL,
	"from_plan" "plan",
	"to_plan" "plan",
	"amount" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"dodo_event_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "billing_events_dodo_event_id_unique" UNIQUE("dodo_event_id")
);
--> statement-breakpoint

-- Recreate subscriptions
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"dodo_subscription_id" text,
	"dodo_customer_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subscriptions_dodo_subscription_id_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint

-- Recreate usage_overrides
CREATE TABLE "usage_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"links_per_month" integer,
	"clicks_tracked_per_month" integer,
	"custom_domains" integer,
	"team_members" integer,
	"api_calls_per_hour" integer,
	"ab_testing_enabled" boolean,
	"white_label_enabled" boolean,
	"bio_pages" integer,
	"analytics_retention_days" integer,
	"reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_by" text,
	CONSTRAINT "usage_overrides_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint

-- Foreign keys
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_overrides" ADD CONSTRAINT "usage_overrides_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Indexes
CREATE INDEX "billing_events_workspace_idx" ON "billing_events" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "billing_events_dodo_id_idx" ON "billing_events" USING btree ("dodo_event_id");
--> statement-breakpoint
CREATE INDEX "subscriptions_workspace_idx" ON "subscriptions" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "subscriptions_dodo_id_idx" ON "subscriptions" USING btree ("dodo_subscription_id");

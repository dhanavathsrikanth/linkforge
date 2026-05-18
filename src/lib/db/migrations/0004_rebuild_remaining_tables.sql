-- Migration 0004: Rebuild all remaining empty-shell tables from clean-for-migrate
-- Tables affected: link_gallery, link_gallery_clicks, usage_counters, conversions

DROP TABLE IF EXISTS "link_gallery_clicks" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "link_gallery" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "usage_counters" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "conversions" CASCADE;
--> statement-breakpoint

CREATE TABLE "conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event" text NOT NULL,
	"value" numeric(12, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "link_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"custom_domain_id" uuid,
	"slug" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"avatar_initials" text,
	"avatar_bg_color" text DEFAULT '#6366f1' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"appearance" jsonb,
	"seo_title" text,
	"seo_description" text,
	"show_branding" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_gallery_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

CREATE TABLE "link_gallery_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"link_index" integer NOT NULL,
	"ip" text,
	"country" text,
	"device" "device_type" DEFAULT 'unknown' NOT NULL,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "usage_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"month_start" timestamp with time zone NOT NULL,
	"links_created" integer DEFAULT 0 NOT NULL,
	"domains_created" integer DEFAULT 0 NOT NULL,
	"api_calls" integer DEFAULT 0 NOT NULL,
	"clicks_tracked" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "conversions" ADD CONSTRAINT "conversions_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "link_gallery" ADD CONSTRAINT "link_gallery_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "link_gallery" ADD CONSTRAINT "link_gallery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "link_gallery" ADD CONSTRAINT "link_gallery_custom_domain_id_domains_id_fk" FOREIGN KEY ("custom_domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "link_gallery_clicks" ADD CONSTRAINT "link_gallery_clicks_gallery_id_link_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."link_gallery"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "conversions_link_id_idx" ON "conversions" USING btree ("link_id");
--> statement-breakpoint
CREATE INDEX "conversions_workspace_idx" ON "conversions" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "conversions_created_at_idx" ON "conversions" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "link_gallery_slug_idx" ON "link_gallery" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "link_gallery_user_idx" ON "link_gallery" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "link_gallery_workspace_idx" ON "link_gallery" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "lgc_gallery_idx" ON "link_gallery_clicks" USING btree ("gallery_id");
--> statement-breakpoint
CREATE INDEX "lgc_created_at_idx" ON "link_gallery_clicks" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_workspace_month_unique_idx" ON "usage_counters" USING btree ("workspace_id","month_start");
--> statement-breakpoint
CREATE INDEX "usage_counters_workspace_idx" ON "usage_counters" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "usage_counters_month_idx" ON "usage_counters" USING btree ("month_start");

CREATE TYPE "public"."device_type" AS ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'growth', 'agency', 'business', 'enterprise');--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ip" text,
	"country" text,
	"city" text,
	"region" text,
	"device" "device_type" DEFAULT 'unknown' NOT NULL,
	"browser" text,
	"os" text,
	"referrer" text,
	"referrer_domain" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"ab_variant" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"domain_id" uuid,
	"slug" text NOT NULL,
	"destination" text NOT NULL,
	"title" text,
	"description" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"password" text,
	"expires_at" timestamp with time zone,
	"click_limit" integer,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"unique_clicks" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"ios_destination" text,
	"android_destination" text,
	"geo_routing" jsonb,
	"ab_test_enabled" boolean DEFAULT false NOT NULL,
	"ab_test_variants" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"logo" text,
	"custom_domain" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workspaces_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_link_id_idx" ON "clicks" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "clicks_workspace_idx" ON "clicks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "clicks_created_at_idx" ON "clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "clicks_country_idx" ON "clicks" USING btree ("country");--> statement-breakpoint
CREATE INDEX "clicks_referrer_domain_idx" ON "clicks" USING btree ("referrer_domain");--> statement-breakpoint
CREATE INDEX "conversions_link_id_idx" ON "conversions" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "conversions_workspace_idx" ON "conversions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "conversions_created_at_idx" ON "conversions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "domains_workspace_idx" ON "domains" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "links_domain_slug_unique_idx" ON "links" USING btree ("domain_id","slug");--> statement-breakpoint
CREATE INDEX "links_workspace_idx" ON "links" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "links_slug_idx" ON "links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "links_created_at_idx" ON "links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "links_user_idx" ON "links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_unique_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "workspaces" USING btree ("owner_id");
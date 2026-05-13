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
ALTER TABLE "clicks" ADD COLUMN "is_qr_scan" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "routing_rules" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "qr_settings" jsonb DEFAULT '{"fgColor":"#000000","bgColor":"#ffffff","errorLevel":"M","size":256,"rounded":false,"frameStyle":"none"}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthday" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_email_address_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_phone_number_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_web3_wallet_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_enabled" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sign_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_addresses" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_numbers" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "external_accounts" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "web3_wallets" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "private_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "unsafe_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "utm_templates" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "default_utm_template_id" uuid;--> statement-breakpoint
ALTER TABLE "link_gallery" ADD CONSTRAINT "link_gallery_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_gallery" ADD CONSTRAINT "link_gallery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_gallery" ADD CONSTRAINT "link_gallery_custom_domain_id_domains_id_fk" FOREIGN KEY ("custom_domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_gallery_clicks" ADD CONSTRAINT "link_gallery_clicks_gallery_id_link_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."link_gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "link_gallery_slug_idx" ON "link_gallery" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "link_gallery_user_idx" ON "link_gallery" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "link_gallery_workspace_idx" ON "link_gallery" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "lgc_gallery_idx" ON "link_gallery_clicks" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "lgc_created_at_idx" ON "link_gallery_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_workspace_month_unique_idx" ON "usage_counters" USING btree ("workspace_id","month_start");--> statement-breakpoint
CREATE INDEX "usage_counters_workspace_idx" ON "usage_counters" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "usage_counters_month_idx" ON "usage_counters" USING btree ("month_start");
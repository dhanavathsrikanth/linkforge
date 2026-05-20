CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_type" text DEFAULT 'secret' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"feature" text NOT NULL,
	"points" integer DEFAULT 50 NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by" text,
	"workspace_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "clerk_org_name" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_unique_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_workspace_idx" ON "api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_feature_unique_idx" ON "waitlist" USING btree ("email","feature");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_referral_code_idx" ON "waitlist" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "waitlist_feature_idx" ON "waitlist" USING btree ("feature");--> statement-breakpoint
CREATE INDEX "workspaces_clerk_org_idx" ON "workspaces" USING btree ("clerk_org_id");--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_clerk_org_id_unique" UNIQUE("clerk_org_id");
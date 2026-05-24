CREATE TABLE "ab_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"variant_destination" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"conversion_rate" numeric(5, 4) DEFAULT '0',
	"unique_clicks" integer DEFAULT 0 NOT NULL,
	"cta_score" numeric(6, 4) DEFAULT '0',
	"is_winner" boolean DEFAULT false,
	"significance_level" numeric(5, 4),
	"recorded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "links" ALTER COLUMN "ab_test_variants" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "links" ALTER COLUMN "qr_settings" SET DEFAULT '{"fgColor":"#000000","bgColor":"#ffffff","errorLevel":"M","size":256,"rounded":false,"frameStyle":"none","logoOpacity":1,"logoSize":"medium","marginSize":0,"boostLevel":true,"minVersion":1}'::jsonb;--> statement-breakpoint
ALTER TABLE "clicks" ADD COLUMN "ab_test_id" uuid;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_winner" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_significance" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ab_test_ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ab_test_results_link_id_idx" ON "ab_test_results" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "ab_test_results_workspace_idx" ON "ab_test_results" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
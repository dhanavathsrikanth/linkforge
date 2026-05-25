CREATE TABLE "attribution_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"journey_id" uuid,
	"link_id" uuid,
	"model" text NOT NULL,
	"credit" numeric(5, 4) NOT NULL,
	"credit_value" numeric(10, 2),
	"calculated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"customer_id" text,
	"customer_email" text,
	"touchpoints" jsonb DEFAULT '[]'::jsonb,
	"first_touch_link_id" uuid,
	"last_touch_link_id" uuid,
	"converted" boolean DEFAULT false,
	"conversion_value" numeric(10, 2),
	"conversion_event" text,
	"conversion_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"total_touchpoints" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_failed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" DEFAULT 'viewer' NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "attribution_results" ADD CONSTRAINT "attribution_results_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribution_results" ADD CONSTRAINT "attribution_results_journey_id_customer_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."customer_journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribution_results" ADD CONSTRAINT "attribution_results_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attribution_results_workspace_idx" ON "attribution_results" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "attribution_results_journey_idx" ON "attribution_results" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "attribution_results_link_idx" ON "attribution_results" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "attribution_results_model_idx" ON "attribution_results" USING btree ("model");--> statement-breakpoint
CREATE INDEX "customer_journeys_workspace_idx" ON "customer_journeys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "customer_journeys_session_idx" ON "customer_journeys" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "customer_journeys_converted_idx" ON "customer_journeys" USING btree ("converted");--> statement-breakpoint
CREATE INDEX "webhook_failed_events_resolved_idx" ON "webhook_failed_events" USING btree ("resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invite_email_workspace_idx" ON "workspace_invites" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "workspace_invites_token_idx" ON "workspace_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "workspace_invites_workspace_idx" ON "workspace_invites" USING btree ("workspace_id");
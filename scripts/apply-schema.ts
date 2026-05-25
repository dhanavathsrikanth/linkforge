import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  console.log("Step 1: Add unique constraint on workspaces.clerk_org_id (if not exists)...");
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_clerk_org_id_unique'
      ) THEN
        ALTER TABLE workspaces ADD CONSTRAINT workspaces_clerk_org_id_unique UNIQUE (clerk_org_id);
      END IF;
    END $$;
  `;
  console.log("✓ workspaces_clerk_org_id_unique constraint ensured");

  console.log("Step 2: Create folders table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "folders" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "user_id" uuid REFERENCES users(id) ON DELETE SET NULL,
      "name" text NOT NULL,
      "description" text,
      "color" text DEFAULT '#433BFF' NOT NULL,
      "icon" text DEFAULT 'folder',
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  console.log("✓ folders table ensured");

  console.log("Step 3: Create folders indexes if not exists...");
  await sql`CREATE INDEX IF NOT EXISTS folders_workspace_idx ON folders USING btree (workspace_id);`;
  await sql`CREATE INDEX IF NOT EXISTS folders_created_at_idx ON folders USING btree (created_at);`;
  console.log("✓ folders indexes ensured");

  console.log("Step 4: Add folder_id to links table if not exists...");
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='links' AND column_name='folder_id'
      ) THEN
        ALTER TABLE links ADD COLUMN "folder_id" uuid REFERENCES folders(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `;
  console.log("✓ links.folder_id ensured");

  console.log("Step 5: Create workspace_tags table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "workspace_tags" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "name" text NOT NULL,
      "color" text DEFAULT '#433BFF' NOT NULL,
      "description" text,
      "usage_count" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS workspace_tags_ws_name_unique_idx ON workspace_tags USING btree (workspace_id, name);`;
  await sql`CREATE INDEX IF NOT EXISTS workspace_tags_workspace_idx ON workspace_tags USING btree (workspace_id);`;
  console.log("✓ workspace_tags table ensured");

  console.log("Step 6: Create audit_logs table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "actor_id" uuid REFERENCES users(id) ON DELETE SET NULL,
      "action" text NOT NULL,
      "entity_type" text NOT NULL,
      "entity_id" uuid,
      "metadata" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON audit_logs USING btree (workspace_id);`;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs USING btree (entity_type, entity_id);`;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs USING btree (created_at);`;
  console.log("✓ audit_logs table ensured");

  console.log("Step 7: Create ab_test_results table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "ab_test_results" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "link_id" uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS ab_test_results_link_id_idx ON ab_test_results USING btree (link_id);`;
  await sql`CREATE INDEX IF NOT EXISTS ab_test_results_workspace_idx ON ab_test_results USING btree (workspace_id);`;
  console.log("✓ ab_test_results table ensured");

  console.log("Step 8: Add missing columns to links if not exists...");
  const linkCols = [
    { col: "scheduled_at", type: "timestamp with time zone" },
    { col: "ab_test_winner", type: "text" },
    { col: "ab_test_significance", type: "numeric(5,4)" },
    { col: "ab_test_started_at", type: "timestamp with time zone" },
    { col: "ab_test_ended_at", type: "timestamp with time zone" },
  ];
  for (const { col, type } of linkCols) {
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name='links' AND column_name='${col}'
        ) THEN
          ALTER TABLE links ADD COLUMN "${col}" ${type};
        END IF;
      END $$;
    `);
  }
  console.log("✓ links additional columns ensured");

  console.log("Step 9: Create webhook_failed_events table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "webhook_failed_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "event_type" text NOT NULL,
      "payload" jsonb NOT NULL,
      "error" text NOT NULL,
      "attempts" integer DEFAULT 1 NOT NULL,
      "last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
      "resolved_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS webhook_failed_events_resolved_idx ON webhook_failed_events USING btree (resolved_at);`;
  console.log("✓ webhook_failed_events table ensured");

  console.log("Step 10: Create workspace_invites table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "workspace_invites" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "email" text NOT NULL,
      "role" text DEFAULT 'viewer' NOT NULL,
      "token" text NOT NULL UNIQUE,
      "invited_by" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "expires_at" timestamp with time zone NOT NULL,
      "accepted_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS workspace_invite_email_workspace_idx ON workspace_invites USING btree (workspace_id, email);`;
  await sql`CREATE INDEX IF NOT EXISTS workspace_invites_token_idx ON workspace_invites USING btree (token);`;
  await sql`CREATE INDEX IF NOT EXISTS workspace_invites_workspace_idx ON workspace_invites USING btree (workspace_id);`;
  console.log("✓ workspace_invites table ensured");

  console.log("Step 11: Create customer_journeys table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "customer_journeys" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
  `;
  await sql`CREATE INDEX IF NOT EXISTS customer_journeys_workspace_idx ON customer_journeys USING btree (workspace_id);`;
  await sql`CREATE INDEX IF NOT EXISTS customer_journeys_session_idx ON customer_journeys USING btree (session_id);`;
  await sql`CREATE INDEX IF NOT EXISTS customer_journeys_converted_idx ON customer_journeys USING btree (converted);`;
  console.log("✓ customer_journeys table ensured");

  console.log("Step 12: Create attribution_results table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "attribution_results" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "journey_id" uuid REFERENCES customer_journeys(id) ON DELETE CASCADE,
      "link_id" uuid REFERENCES links(id) ON DELETE CASCADE,
      "model" text NOT NULL,
      "credit" numeric(5, 4) NOT NULL,
      "credit_value" numeric(10, 2),
      "calculated_at" timestamp with time zone DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS attribution_results_workspace_idx ON attribution_results USING btree (workspace_id);`;
  await sql`CREATE INDEX IF NOT EXISTS attribution_results_journey_idx ON attribution_results USING btree (journey_id);`;
  await sql`CREATE INDEX IF NOT EXISTS attribution_results_link_idx ON attribution_results USING btree (link_id);`;
  await sql`CREATE INDEX IF NOT EXISTS attribution_results_model_idx ON attribution_results USING btree (model);`;
  console.log("✓ attribution_results table ensured");

  console.log("\n✅ All schema changes applied successfully!");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

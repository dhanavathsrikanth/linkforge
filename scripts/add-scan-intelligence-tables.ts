import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

/**
 * Adds the URL Scanner intelligence storage:
 *
 *   - `scan_reports`     — full historical scan payloads, one row per Cloudflare scan
 *   - `asset_risk_flags` — typed warnings emitted by the Asset_Risk_Analyzer
 *   - extra columns on `links` for Trust Score / Trust Band
 *
 * Idempotent. Safe to re-run.
 */
async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const sql = neon(url);

  console.log('[add-scan-intelligence] Creating scan_reports…');
  await sql`
    CREATE TABLE IF NOT EXISTS "scan_reports" (
      "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "link_id"           uuid NOT NULL REFERENCES "links"("id") ON DELETE CASCADE,
      "workspace_id"      uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "scan_id"           text NOT NULL,
      "status"            text NOT NULL DEFAULT 'pending',
      "fetched_at"        timestamp with time zone DEFAULT now(),
      "submitted_at"      timestamp with time zone NOT NULL DEFAULT now(),

      -- Verdict
      "malicious"         boolean,
      "phishing_kit"      text,

      -- Page primary response
      "page_url"          text,
      "page_ip"           text,
      "page_asn"          text,
      "page_asn_name"     text,
      "page_country"      text,
      "page_server"       text,

      -- Hashes & rank
      "dom_struct_hash"   text,
      "screenshot_hash"   text,
      "favicon_hash"      text,
      "radar_rank"        integer,

      -- Trust score
      "trust_score"       integer,
      "trust_band"        text,
      "weight_version"    integer,

      -- Lists & meta (JSON for flexibility)
      "redirect_chain"    jsonb DEFAULT '[]'::jsonb,
      "categories"        jsonb DEFAULT '[]'::jsonb,
      "technologies"      jsonb DEFAULT '[]'::jsonb,
      "contacted_ips"     jsonb DEFAULT '[]'::jsonb,
      "contacted_asns"    jsonb DEFAULT '[]'::jsonb,
      "contacted_domains" jsonb DEFAULT '[]'::jsonb,
      "certificates"      jsonb DEFAULT '[]'::jsonb,
      "performance"       jsonb,
      "cookies_summary"   jsonb,
      "globals_summary"   jsonb,
      "console_summary"   jsonb,

      -- Raw payload (for forward-compat & re-derivation)
      "raw_payload"       jsonb,

      -- Bookkeeping
      "schema_version"    integer NOT NULL DEFAULT 1,
      "rescan_reason"     text,
      "validation_error"  text,
      "screenshot_unavailable" boolean NOT NULL DEFAULT false,
      "similar_to_malicious"   jsonb,

      "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at"        timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "scan_reports_link_idx"      ON "scan_reports" ("link_id", "fetched_at" DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "scan_reports_workspace_idx" ON "scan_reports" ("workspace_id", "fetched_at" DESC)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "scan_reports_scan_id_uidx" ON "scan_reports" ("scan_id")
  `;

  console.log('[add-scan-intelligence] Creating asset_risk_flags…');
  await sql`
    CREATE TABLE IF NOT EXISTS "asset_risk_flags" (
      "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "scan_id"     uuid NOT NULL REFERENCES "scan_reports"("id") ON DELETE CASCADE,
      "link_id"     uuid NOT NULL REFERENCES "links"("id") ON DELETE CASCADE,
      "kind"        text NOT NULL,
      "payload"     jsonb DEFAULT '{}'::jsonb,
      "created_at"  timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "asset_risk_flags_scan_idx" ON "asset_risk_flags" ("scan_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "asset_risk_flags_link_idx" ON "asset_risk_flags" ("link_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "asset_risk_flags_kind_idx" ON "asset_risk_flags" ("kind")
  `;

  console.log('[add-scan-intelligence] Adding trust columns to links…');
  await sql`
    ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "safety_trust_score" integer
  `;
  await sql`
    ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "safety_trust_band"  text NOT NULL DEFAULT 'unknown'
  `;
  await sql`
    ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "safety_weight_version" integer
  `;

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'links' AND column_name LIKE 'safety_%'
    ORDER BY column_name
  `;
  console.log('[add-scan-intelligence] links safety columns:', cols);

  console.log('[add-scan-intelligence] Done.');
}

run().catch((err) => {
  console.error('[add-scan-intelligence] failed', err);
  process.exit(1);
});

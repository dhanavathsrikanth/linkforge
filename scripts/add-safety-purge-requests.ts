import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

/**
 * Tracks Right-To-Be-Forgotten purge requests for scan data (Req 21).
 *
 * When a workspace operator requests a RTBF purge for a deleted link, we
 * record the request here. A daily cron sweeps rows whose `purge_after`
 * timestamp has passed and deletes the associated scan_reports,
 * scan_screenshots, and asset_risk_flags.
 *
 * `purge_after` is set to NOW() + 7 days (Req 21.3: "within 7 days").
 * `purged_at` is stamped when the sweep completes.
 */
async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
  const sql = neon(url);

  console.log('[add-safety-purge-requests] Creating table…');
  await sql`
    CREATE TABLE IF NOT EXISTS "safety_purge_requests" (
      "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "link_id"       text NOT NULL,
      "workspace_id"  uuid NOT NULL,
      "requested_by"  text NOT NULL,
      "purge_after"   timestamp with time zone NOT NULL,
      "purged_at"     timestamp with time zone,
      "created_at"    timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "spr_workspace_idx"  ON "safety_purge_requests" ("workspace_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "spr_purge_after_idx" ON "safety_purge_requests" ("purge_after")
    WHERE "purged_at" IS NULL
  `;
  console.log('[add-safety-purge-requests] Done.');
}

run().catch(err => { console.error(err); process.exit(1); });

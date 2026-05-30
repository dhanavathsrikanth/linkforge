import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

/**
 * Stores Cloudflare URL Scanner screenshots as raw bytes in Neon Postgres.
 *
 * Design notes:
 *  - bytea column instead of base64-encoded text — base64 inflates payload
 *    by ~33% with zero benefit. PNG bytes are already deflate-compressed
 *    losslessly by Cloudflare, so no further server-side re-encoding.
 *  - One row per scan_id (the scan UUID is the unique screenshot key).
 *  - We also keep a `link_id` and `workspace_id` so the retention service
 *    can sweep by age + link without joining.
 *  - `width` and `height` are nullable — we don't decode the PNG just to
 *    read dimensions; if a future feature needs them we can backfill.
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

  console.log('[add-scan-screenshots] Creating scan_screenshots…');
  await sql`
    CREATE TABLE IF NOT EXISTS "scan_screenshots" (
      "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "scan_report_id" uuid NOT NULL REFERENCES "scan_reports"("id") ON DELETE CASCADE,
      "scan_id"       text NOT NULL,
      "link_id"       uuid NOT NULL REFERENCES "links"("id") ON DELETE CASCADE,
      "workspace_id"  uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "resolution"    text NOT NULL DEFAULT 'desktop',
      "mime_type"     text NOT NULL DEFAULT 'image/png',
      "bytes"         bytea NOT NULL,
      "size_bytes"    integer NOT NULL,
      "width"         integer,
      "height"        integer,
      "fetched_at"    timestamp with time zone NOT NULL DEFAULT now(),
      "created_at"    timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "scan_screenshots_scan_resolution_uidx"
      ON "scan_screenshots" ("scan_id", "resolution")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "scan_screenshots_link_idx"      ON "scan_screenshots" ("link_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "scan_screenshots_workspace_idx" ON "scan_screenshots" ("workspace_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "scan_screenshots_fetched_idx"   ON "scan_screenshots" ("fetched_at")
  `;

  console.log('[add-scan-screenshots] Adding visitor_preview_enabled to workspaces…');
  await sql`
    ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "visitor_preview_enabled" boolean NOT NULL DEFAULT true
  `;

  console.log('[add-scan-screenshots] Done.');
}

run().catch((err) => {
  console.error('[add-scan-screenshots] failed', err);
  process.exit(1);
});

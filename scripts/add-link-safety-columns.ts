import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

/**
 * Adds safety columns to the `links` table. Idempotent.
 *
 * - safety_status:        text (CHECK constraint via app code, no enum type)
 * - safety_scan_id:       Cloudflare URL Scanner UUID
 * - safety_scanned_at:    when the verdict was last updated
 * - safety_verdict:       jsonb with verdict details (categories, phishing, etc.)
 * - safety_blocked_by_admin: manual block flag
 *
 * Plus a partial index on (workspace_id, safety_status) for dashboard queries.
 */
async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const sql = neon(url);

  console.log('[add-link-safety] Adding columns to links…');

  await sql`
    ALTER TABLE "links"
      ADD COLUMN IF NOT EXISTS "safety_status" text NOT NULL DEFAULT 'unknown'
  `;
  await sql`
    ALTER TABLE "links"
      ADD COLUMN IF NOT EXISTS "safety_scan_id" text
  `;
  await sql`
    ALTER TABLE "links"
      ADD COLUMN IF NOT EXISTS "safety_scanned_at" timestamp with time zone
  `;
  await sql`
    ALTER TABLE "links"
      ADD COLUMN IF NOT EXISTS "safety_verdict" jsonb
  `;
  await sql`
    ALTER TABLE "links"
      ADD COLUMN IF NOT EXISTS "safety_blocked_by_admin" boolean NOT NULL DEFAULT false
  `;

  // Index for "show me malicious/pending links in this workspace" queries.
  await sql`
    CREATE INDEX IF NOT EXISTS "links_safety_status_idx"
      ON "links" ("workspace_id", "safety_status")
  `;

  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'links'
      AND column_name LIKE 'safety_%'
    ORDER BY column_name
  `;
  console.log('[add-link-safety] Columns now present:', cols);
  console.log('[add-link-safety] Done.');
}

run().catch((err) => {
  console.error('[add-link-safety] failed', err);
  process.exit(1);
});

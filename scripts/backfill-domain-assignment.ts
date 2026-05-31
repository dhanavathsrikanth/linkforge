import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

/**
 * custom-domain-assignment spec — Task 15 backfill. Idempotent.
 *
 * 1. Ensures the additive schema exists (enums, domains/link_gallery columns,
 *    one-bio-per-domain partial unique index). Mirrors migration 0015 so this
 *    is safe to run on a DB that hasn't applied the Drizzle migration yet.
 * 2. Repairs multi-bio-per-domain anomalies (keep most-recently-updated bio,
 *    clear custom_domain_id on the rest) BEFORE the unique index is created.
 * 3. Seeds domains.role from existing bindings:
 *      bound bio + bound links → 'both'
 *      bound bio only          → 'bio'
 *      otherwise               → 'links' (the column default)
 * 4. Pushes domain:{host} routing config to the worker for every verified
 *    domain (best-effort; logs failures).
 *
 * Re-running is a no-op once data is consistent.
 */
async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const sql = neon(url);

  // ── 1. Enums ────────────────────────────────────────────────────────────
  console.log('[backfill] Ensuring enums…');
  await sql`DO $$ BEGIN CREATE TYPE "domain_role" AS ENUM('links','bio','both'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await sql`DO $$ BEGIN CREATE TYPE "domain_status" AS ENUM('active','suspended_billing','suspended_abuse'); EXCEPTION WHEN duplicate_object THEN null; END $$`;

  // ── 2. Columns ──────────────────────────────────────────────────────────
  console.log('[backfill] Ensuring columns…');
  await sql`ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "role" "domain_role" NOT NULL DEFAULT 'links'`;
  await sql`ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "is_apex" boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "root_redirect_url" text`;
  await sql`ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "status" "domain_status" NOT NULL DEFAULT 'active'`;
  await sql`ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone`;
  await sql`ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "suspended_reason" text`;
  await sql`ALTER TABLE "link_gallery" ADD COLUMN IF NOT EXISTS "is_root_page" boolean NOT NULL DEFAULT false`;

  // ── 3. Repair multi-bio-per-domain anomalies BEFORE the unique index ──────
  console.log('[backfill] Repairing multi-bio-per-domain anomalies…');
  const dupes = await sql`
    SELECT custom_domain_id, count(*)::int AS n
    FROM link_gallery
    WHERE custom_domain_id IS NOT NULL
    GROUP BY custom_domain_id
    HAVING count(*) > 1
  `;
  for (const row of dupes as Array<{ custom_domain_id: string; n: number }>) {
    // Keep the most-recently-updated bio; clear the rest.
    const cleared = await sql`
      UPDATE link_gallery
      SET custom_domain_id = NULL, is_root_page = false
      WHERE custom_domain_id = ${row.custom_domain_id}
        AND id <> (
          SELECT id FROM link_gallery
          WHERE custom_domain_id = ${row.custom_domain_id}
          ORDER BY updated_at DESC
          LIMIT 1
        )
      RETURNING id
    `;
    console.warn(
      `[backfill] domain ${row.custom_domain_id}: had ${row.n} bios, cleared ${(cleared as unknown[]).length}`
    );
  }

  // ── 4. One-bio-per-domain partial unique index ────────────────────────────
  console.log('[backfill] Ensuring one-bio-per-domain index…');
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "link_gallery_custom_domain_uidx"
      ON "link_gallery" ("custom_domain_id")
      WHERE custom_domain_id IS NOT NULL
  `;

  // ── 5. Seed role from existing bindings ───────────────────────────────────
  console.log('[backfill] Seeding domain.role from bindings…');
  // 'both' where a domain has a bound bio AND at least one bound link
  await sql`
    UPDATE domains d SET role = 'both'
    WHERE EXISTS (SELECT 1 FROM link_gallery g WHERE g.custom_domain_id = d.id)
      AND EXISTS (SELECT 1 FROM links l WHERE l.domain_id = d.id)
  `;
  // 'bio' where a bound bio but no bound links
  await sql`
    UPDATE domains d SET role = 'bio'
    WHERE EXISTS (SELECT 1 FROM link_gallery g WHERE g.custom_domain_id = d.id)
      AND NOT EXISTS (SELECT 1 FROM links l WHERE l.domain_id = d.id)
  `;
  // everything else stays 'links' (default)

  // ── 6. Push domain:{host} config to the worker (best-effort) ──────────────
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (workerUrl && workerSecret) {
    console.log('[backfill] Syncing domain:{host} config to worker…');
    const verified = await sql`
      SELECT d.id, d.domain, d.role, d.status, d.workspace_id, d.root_redirect_url,
             g.id AS bio_id, g.slug AS bio_slug
      FROM domains d
      LEFT JOIN link_gallery g
        ON g.custom_domain_id = d.id AND g.is_published = true
      WHERE d.verified = true
    `;
    let ok = 0, fail = 0;
    for (const r of verified as Array<Record<string, unknown>>) {
      const config = {
        role: r.role,
        status: r.status,
        workspaceId: r.workspace_id,
        hasRootBio: !!r.bio_id,
        rootBioId: r.bio_id ?? undefined,
        rootBioSlug: r.bio_slug ?? undefined,
        rootRedirectUrl: r.root_redirect_url ?? undefined,
      };
      try {
        const res = await fetch(`${workerUrl}/internal/domain-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-worker-secret': workerSecret },
          body: JSON.stringify({ host: r.domain, config }),
        });
        if (res.ok) ok++; else { fail++; console.warn(`[backfill] config push failed for ${r.domain}: ${res.status}`); }
      } catch (e) {
        fail++;
        console.warn(`[backfill] config push error for ${r.domain}:`, e);
      }
    }
    console.log(`[backfill] worker config sync: ${ok} ok, ${fail} failed`);
  } else {
    console.log('[backfill] CF_WORKER_URL/WORKER_SECRET not set — skipping worker sync');
  }

  console.log('[backfill] Done.');
}

run().catch((err) => {
  console.error('[backfill] failed', err);
  process.exit(1);
});

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Applies only the 0003 migration directly, bypassing the Drizzle CLI.
 * This is needed because the Drizzle CLI re-runs 0001 which tries to create
 * the "device_type" enum that already exists from 0000.
 * 
 * After this runs, 0003 is recorded in drizzle.__drizzle_migrations
 * so future db:migrate calls will skip it cleanly.
 */
async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  const migrationFile = path.join('src/lib/db/migrations', '0004_rebuild_remaining_tables.sql');
  const content = fs.readFileSync(migrationFile, 'utf-8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  // Check if already applied
  const existing = await sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
  if (existing.length > 0) {
    console.log('Migration 0004 already applied, skipping.');
    return;
  }

  console.log('Applying migration 0004_rebuild_remaining_tables...');

  // Split on the Drizzle statement-breakpoint marker and run each statement
  const statements = content
    .split('--> statement-breakpoint')
    .map(s => {
      // Remove comment lines and trim
      return s
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
    })
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await sql.query(statement, []);
      console.log(`  ✓ ${statement.slice(0, 60).replace(/\n/g, ' ')}...`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`  ⚠ Skipped (already exists): ${statement.slice(0, 60).replace(/\n/g, ' ')}...`);
      } else {
        throw e;
      }
    }
  }

  // Record in Drizzle's tracking table
  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
  console.log('\n✓ Migration 0004 applied and recorded successfully!');
}

run().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});

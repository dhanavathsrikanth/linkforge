import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
dotenv.config({ path: '.env.local' });
async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE scan_reports ADD COLUMN IF NOT EXISTS har_summary jsonb`;
  console.log('har_summary column added');
}
run().catch(e => { console.error(e); process.exit(1); });

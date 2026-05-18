import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = ['link_gallery', 'link_gallery_clicks', 'conversions', 'usage_counters'];
  for (const table of tables) {
    const rows = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
      ORDER BY ordinal_position
    `;
    console.log(`${table}: ${rows.length} columns — ${rows.map((r: any) => r.column_name).join(', ')}`);
  }
}
run();

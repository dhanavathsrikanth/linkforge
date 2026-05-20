import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log('Applying 0005 — adding clerk_org_id / clerk_org_name to workspaces...');
  await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS clerk_org_id text UNIQUE;`;
  await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS clerk_org_name text;`;
  await sql`CREATE INDEX IF NOT EXISTS workspaces_clerk_org_idx ON workspaces(clerk_org_id);`;
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });

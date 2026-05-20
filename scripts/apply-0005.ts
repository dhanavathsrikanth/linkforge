import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  const version = process.argv[2] || '0005';

  if (version === '0005' || version === 'all') {
    console.log('Applying 0005 — adding clerk_org_id / clerk_org_name to workspaces...');
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS clerk_org_id text UNIQUE;`;
    await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS clerk_org_name text;`;
    await sql`CREATE INDEX IF NOT EXISTS workspaces_clerk_org_idx ON workspaces(clerk_org_id);`;
    console.log('0005 done!');
  }

  if (version === '0006' || version === 'all') {
    console.log('Applying 0006 — adding email / workspace_name to workspace_members...');
    await sql`ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS email text;`;
    await sql`ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS workspace_name text;`;
    console.log('0006 done!');
  }

  console.log('All done!');
}

run().catch(e => { console.error(e); process.exit(1); });

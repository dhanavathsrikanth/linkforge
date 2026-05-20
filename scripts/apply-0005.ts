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

  if (version === '0007' || version === 'all') {
    console.log('Applying 0007 — creating audit_logs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        "actor_id" uuid REFERENCES users(id) ON DELETE SET NULL,
        "action" text NOT NULL,
        "entity_type" text NOT NULL,
        "entity_id" uuid,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON audit_logs(workspace_id);`;
    await sql`CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);`;
    await sql`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);`;
    console.log('0007 done!');
  }

  console.log('All done!');
}

run().catch(e => { console.error(e); process.exit(1); });

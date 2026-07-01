require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function test() {
  try {
    // Get the user from the target workspace's org
    const targetOrgId = 'org_3FrpmgMFBk8zNbPK2doroGXMDnq';
    
    // Find the user who is trying to access this
    // Check all users
    const allUsers = await sql`SELECT id, clerk_id, email, name, plan FROM users`;
    console.log('All users:');
    for (const u of allUsers) {
      const wsCount = await sql`SELECT count(*)::int as count FROM workspaces WHERE owner_id = ${u.id}`;
      const memberOf = await sql`SELECT wm.workspace_id, w.name, w.clerk_org_id FROM workspace_members wm JOIN workspaces w ON wm.workspace_id = w.id WHERE wm.user_id = ${u.id}`;
      console.log(`  ${u.clerk_id} (${u.email}, plan=${u.plan}): owns ${wsCount[0].count} workspaces, member of ${memberOf.length} workspaces`);
      for (const m of memberOf) {
        console.log(`    - ${m.name} (org: ${m.clerk_org_id})`);
      }
    }

    // Check all workspaces
    const allWs = await sql`SELECT id, name, slug, owner_id, clerk_org_id, plan FROM workspaces`;
    console.log('\nAll workspaces:');
    for (const w of allWs) {
      const memberCount = await sql`SELECT count(*)::int as count FROM workspace_members WHERE workspace_id = ${w.id}`;
      console.log(`  ${w.name} (${w.slug}, org=${w.clerk_org_id}, plan=${w.plan}): ${memberCount[0].count} members`);
    }

    // Simulate what happens in production: try to create the workspace
    console.log('\nSimulating workspace creation for org:', targetOrgId);
    const orgSlug = targetOrgId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 32) || "org";
    const slug = `${orgSlug}-${targetOrgId.slice(0, 8)}`;
    const name = `Workspace (${targetOrgId.slice(0, 8)})`;
    console.log('  Would create:', { name, slug });

    // Check if slug already exists
    const existingSlug = await sql`SELECT id FROM workspaces WHERE slug = ${slug}`;
    console.log('  Slug exists?', existingSlug.length > 0);

  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
}
test();

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log('=== TABLES ===');
    console.log(JSON.stringify(tables.map(t => t.table_name)));

    const userCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
    console.log('\n=== USERS COLUMNS ===');
    console.log(JSON.stringify(userCols.map(c => c.column_name)));

    const wsCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'workspaces' ORDER BY ordinal_position`;
    console.log('\n=== WORKSPACES COLUMNS ===');
    console.log(JSON.stringify(wsCols.map(c => c.column_name)));

    const wmCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'workspace_members' ORDER BY ordinal_position`;
    console.log('\n=== WORKSPACE_MEMBERS COLUMNS ===');
    console.log(JSON.stringify(wmCols.map(c => c.column_name)));

    const subCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions' ORDER BY ordinal_position`;
    console.log('\n=== SUBSCRIPTIONS COLUMNS ===');
    console.log(JSON.stringify(subCols.map(c => c.column_name)));

  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
main();

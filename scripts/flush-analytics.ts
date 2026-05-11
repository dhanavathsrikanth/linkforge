/**
 * LinkForge Analytics Flush Script
 * 
 * This script triggers the /api/analytics/flush endpoint to migrate
 * buffered click data from Redis to the permanent Postgres database.
 * 
 * Usage: 
 *   export INTERNAL_SECRET=your_secret
 *   export APP_URL=http://localhost:3000
 *   npx tsx scripts/flush-analytics.ts
 */

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function flush() {
  if (!INTERNAL_SECRET) {
    console.error('❌ Error: INTERNAL_SECRET environment variable is not set.');
    process.exit(1);
  }

  console.log(`🚀 Triggering analytics flush at ${APP_URL}...`);

  try {
    const response = await fetch(`${APP_URL}/api/analytics/flush`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INTERNAL_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Success: Flushed ${data.flushed} click records to database.`);
    } else {
      console.error(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Network Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

flush();

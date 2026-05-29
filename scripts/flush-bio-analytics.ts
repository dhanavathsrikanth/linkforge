/**
 * flush-bio-analytics.ts
 *
 * Reads buffered bio page analytics from Cloudflare KV and flushes them
 * to Neon Postgres via POST /api/internal/bio-events.
 *
 * Called by GitHub Actions cron every hour (bio-analytics-flush.yml).
 *
 * Required env vars:
 *   CF_ACCOUNT_ID        — Cloudflare account ID
 *   CF_API_TOKEN         — Cloudflare API token with KV:Edit permission
 *   BIO_ANALYTICS_KV_ID  — KV namespace ID for bio analytics
 *   APP_URL              — https://pivoturl.com
 *   INTERNAL_SECRET      — shared secret for /api/internal/* routes
 */

// Make this file a module to avoid variable name collisions with other scripts
export {};

const CF_BASE = "https://api.cloudflare.com/client/v4";

const {
  CF_ACCOUNT_ID,
  CF_API_TOKEN,
  BIO_ANALYTICS_KV_ID,
  APP_URL,
  INTERNAL_SECRET,
} = process.env;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !BIO_ANALYTICS_KV_ID || !APP_URL || !INTERNAL_SECRET) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// ─── CF KV helpers ────────────────────────────────────────────────────────────

async function kvList(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ prefix, limit: "1000" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `${CF_BASE}/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${BIO_ANALYTICS_KV_ID}/keys?${params}`,
      { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
    );
    const data = await res.json() as any;

    if (!data.success) throw new Error(`KV list failed: ${JSON.stringify(data.errors)}`);

    for (const key of data.result) keys.push(key.name);
    cursor = data.result_info?.cursor;
  } while (cursor);

  return keys;
}

async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(
    `${CF_BASE}/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${BIO_ANALYTICS_KV_ID}/values/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
  );
  if (res.status === 404) return null;
  return res.text();
}

async function kvDelete(key: string): Promise<void> {
  await fetch(
    `${CF_BASE}/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${BIO_ANALYTICS_KV_ID}/values/${encodeURIComponent(key)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
  );
}

async function kvDeleteBulk(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // CF bulk delete: max 10,000 keys per request
  const CHUNK = 10000;
  for (let i = 0; i < keys.length; i += CHUNK) {
    await fetch(
      `${CF_BASE}/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${BIO_ANALYTICS_KV_ID}/bulk/delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(keys.slice(i, i + CHUNK)),
      }
    );
  }
}

// ─── Main flush logic ─────────────────────────────────────────────────────────

async function main() {
  console.log("[bio-analytics-flush] Starting...");

  // 1. List all event keys: bio:events:{galleryId}
  const eventKeys = await kvList("bio:events:");
  console.log(`[bio-analytics-flush] Found ${eventKeys.length} event batches`);

  if (eventKeys.length === 0) {
    console.log("[bio-analytics-flush] Nothing to flush.");
    return;
  }

  // 2. For each gallery, read events + view counts
  const batches: Array<{
    galleryId: string;
    data: any[];
    viewsByDate: Record<string, number>;
  }> = [];

  const keysToDelete: string[] = [];

  for (const eventKey of eventKeys) {
    // eventKey = "bio:events:{galleryId}"
    const galleryId = eventKey.replace("bio:events:", "");

    // Read events
    const eventsRaw = await kvGet(eventKey);
    const events = eventsRaw ? JSON.parse(eventsRaw) : [];

    // Read view counts for the last 8 days
    const viewsByDate: Record<string, number> = {};
    const today = new Date();
    for (let d = 0; d < 8; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10);
      const viewKey = `bio:views:${galleryId}:${dateStr}`;
      const count = await kvGet(viewKey);
      if (count && parseInt(count, 10) > 0) {
        viewsByDate[dateStr] = parseInt(count, 10);
        keysToDelete.push(viewKey);
      }
    }

    if (events.length > 0 || Object.keys(viewsByDate).length > 0) {
      batches.push({ galleryId, data: events, viewsByDate });
      keysToDelete.push(eventKey);
    }
  }

  if (batches.length === 0) {
    console.log("[bio-analytics-flush] No data to send.");
    return;
  }

  // 3. Send to Next.js internal endpoint
  console.log(`[bio-analytics-flush] Sending ${batches.length} batches to ${APP_URL}/api/internal/bio-events`);

  const res = await fetch(`${APP_URL}/api/internal/bio-events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INTERNAL_SECRET}`,
    },
    body: JSON.stringify({ events: batches }),
  });

  const result = await res.json() as any;
  console.log("[bio-analytics-flush] Result:", result);

  if (!res.ok) {
    console.error("[bio-analytics-flush] Flush failed:", result);
    process.exit(1);
  }

  // 4. Delete flushed keys from KV
  console.log(`[bio-analytics-flush] Deleting ${keysToDelete.length} KV keys...`);
  await kvDeleteBulk(keysToDelete);

  console.log("[bio-analytics-flush] Done.");
}

main().catch((err) => {
  console.error("[bio-analytics-flush] Fatal error:", err);
  process.exit(1);
});

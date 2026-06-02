// In-memory sliding window rate limiter for Cloudflare Workers edge.
// Per-instance (not cross-instance accurate, but effective at edge).

interface RateLimitEntry {
  timestamps: number[];
  window: number;
  limit: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimitEdge(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    for (const [k, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < entry.window);
      if (entry.timestamps.length === 0) store.delete(k);
    }
  }

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], window: windowMs, limit };
    store.set(key, entry);
  }

  // Purge expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetMs: 0,
  };
}

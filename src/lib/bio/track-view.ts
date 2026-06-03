import { redis } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1, "30 m"),
  analytics: false,
  prefix: "bio_page_view",
});

// 90-day TTL for all analytics keys
const TTL = 90 * 24 * 60 * 60;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

async function resolveCountry(ip: string, cfCountry?: string | null, vercelCountry?: string | null): Promise<string> {
  if (cfCountry) return cfCountry;
  if (vercelCountry) return vercelCountry;
  // Dev fallback: lightweight IP geo lookup (only for non-loopback IPs)
  if (!ip || ip === "unknown" || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "XX";
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      signal: AbortSignal.timeout(1000),
      headers: { "User-Agent": "linkforge-analytics/1.0" },
    });
    if (res.ok) {
      const cc = (await res.text()).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(cc)) return cc;
    }
  } catch {}
  return "XX";
}

export interface TrackViewInput {
  galleryId: string;
  ip: string;
  cfCountry?: string | null;
  vercelCountry?: string | null;
  deviceTypeHeader?: string | null;
  userAgent?: string | null;
  referer?: string | null;
}

/**
 * Records a page-level view for a bio page directly into Redis.
 * Called from both /p/[slug]/page.tsx (direct) and the HTTP track route.
 * Fire-and-forget safe — swallows all errors.
 */
export async function recordBioPageView(input: TrackViewInput): Promise<void> {
  const { galleryId, ip, cfCountry, vercelCountry, deviceTypeHeader, userAgent, referer } = input;

  try {
    // Rate limit: 1 view per IP per gallery per 30 minutes
    const rl = await ratelimit.limit(`${ip}:${galleryId}`).catch(() => ({ success: true }));
    if (!rl.success) return;

    const today = new Date().toISOString().slice(0, 10);
    const ipHash = await hashIp(ip);

    const country = await resolveCountry(ip, cfCountry, vercelCountry);

    const device = deviceTypeHeader ?? (() => {
      const ua = userAgent ?? "";
      if (/mobile|android|iphone/i.test(ua)) return "mobile";
      if (/tablet|ipad/i.test(ua)) return "tablet";
      return "desktop";
    })();

    let referrerHost = "direct";
    try {
      if (referer) {
        referrerHost = new URL(referer).hostname.replace(/^www\./, "");
      }
    } catch {}

    const uniqueKey = `bio:unique:${galleryId}:${ipHash}`;
    const isUnique = !(await redis.exists(uniqueKey));

    const ops: Promise<unknown>[] = [
      redis.incr(`bio:views:${galleryId}:${today}`).then(() =>
        redis.expire(`bio:views:${galleryId}:${today}`, TTL)),
      redis.incr(`bio:country:${galleryId}:${today}:${country}`).then(() =>
        redis.expire(`bio:country:${galleryId}:${today}:${country}`, TTL)),
      redis.incr(`bio:device:${galleryId}:${today}:${device}`).then(() =>
        redis.expire(`bio:device:${galleryId}:${today}:${device}`, TTL)),
      redis.incr(`bio:referrer:${galleryId}:${today}:${referrerHost}`).then(() =>
        redis.expire(`bio:referrer:${galleryId}:${today}:${referrerHost}`, TTL)),
    ];

    if (isUnique) {
      ops.push(redis.set(uniqueKey, "1", { ex: 86400 }));
      ops.push(redis.incr(`bio:unique_views:${galleryId}:${today}`).then(() =>
        redis.expire(`bio:unique_views:${galleryId}:${today}`, TTL)));
    }

    await Promise.allSettled(ops);
  } catch {
    // Fire-and-forget — never throw
  }
}

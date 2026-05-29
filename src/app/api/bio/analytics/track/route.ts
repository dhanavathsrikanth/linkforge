import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGallery } from "@/lib/db";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * POST /api/bio/analytics/track
 *
 * Records a page-level view event for a bio page.
 * Called server-side from /p/[slug]/page.tsx on every page load.
 *
 * Writes to Redis (not Postgres) to avoid FK constraints on
 * link_gallery_block_events.blockId. The analytics GET route reads
 * from Redis for view counts and from Postgres for click/reaction events.
 *
 * Redis keys written:
 *   bio:views:{galleryId}:{YYYY-MM-DD}          → integer (total views)
 *   bio:unique:{galleryId}:{ipHash}              → "1" (24h TTL)
 *   bio:country:{galleryId}:{YYYY-MM-DD}:{cc}   → integer (views per country)
 *   bio:device:{galleryId}:{YYYY-MM-DD}:{device} → integer
 *   bio:referrer:{galleryId}:{YYYY-MM-DD}:{host} → integer
 *
 * Rate limited: 1 event per IP per gallery per 30 minutes.
 */

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
    .slice(0, 16); // 16 hex chars is enough for dedup
}

export async function POST(req: Request) {
  let body: { galleryId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { galleryId } = body;
  if (!galleryId) {
    return NextResponse.json({ error: "galleryId required" }, { status: 400 });
  }

  // Verify gallery exists and is published (cached check)
  const gallery = await db.query.linkGallery.findFirst({
    where: eq(linkGallery.id, galleryId),
    columns: { id: true, isPublished: true },
  });

  if (!gallery?.isPublished) {
    return NextResponse.json({ ok: false });
  }

  // Get visitor info
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  // Rate limit: 1 view per IP per gallery per 30 minutes
  const rl = await ratelimit.limit(`${ip}:${galleryId}`).catch(() => ({ success: true }));
  if (!rl.success) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const today = new Date().toISOString().slice(0, 10);
  const ipHash = await hashIp(ip);

  const country =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    "XX";

  const device =
    req.headers.get("x-device-type") ??
    (() => {
      const ua = req.headers.get("user-agent") ?? "";
      if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
      if (/tablet|ipad/i.test(ua)) return "tablet";
      return "desktop";
    })();

  const referrerHeader = req.headers.get("referer") ?? "";
  let referrerHost = "direct";
  try {
    if (referrerHeader) {
      referrerHost = new URL(referrerHeader).hostname.replace(/^www\./, "");
    }
  } catch {}

  // Check unique visitor (24h window)
  const uniqueKey = `bio:unique:${galleryId}:${ipHash}`;
  const isUnique = !(await redis.exists(uniqueKey));

  // Write all analytics keys in parallel (fire-and-forget style)
  const ops: Promise<unknown>[] = [
    // Total views today
    redis.incr(`bio:views:${galleryId}:${today}`).then(() =>
      redis.expire(`bio:views:${galleryId}:${today}`, TTL)
    ),
    // Country breakdown
    redis.incr(`bio:country:${galleryId}:${today}:${country}`).then(() =>
      redis.expire(`bio:country:${galleryId}:${today}:${country}`, TTL)
    ),
    // Device breakdown
    redis.incr(`bio:device:${galleryId}:${today}:${device}`).then(() =>
      redis.expire(`bio:device:${galleryId}:${today}:${device}`, TTL)
    ),
    // Referrer breakdown
    redis.incr(`bio:referrer:${galleryId}:${today}:${referrerHost}`).then(() =>
      redis.expire(`bio:referrer:${galleryId}:${today}:${referrerHost}`, TTL)
    ),
  ];

  // Unique visitor flag (24h TTL)
  if (isUnique) {
    ops.push(redis.set(uniqueKey, "1", { ex: 86400 }));
    // Unique visitors today
    ops.push(
      redis.incr(`bio:unique_views:${galleryId}:${today}`).then(() =>
        redis.expire(`bio:unique_views:${galleryId}:${today}`, TTL)
      )
    );
  }

  await Promise.allSettled(ops);

  return NextResponse.json({ ok: true, counted: true, isUnique });
}

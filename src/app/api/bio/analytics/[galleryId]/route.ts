import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGallery, linkGalleryBlockEvents } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { eq, and, gte, sql, count, countDistinct } from "drizzle-orm";
import { redis } from "@/lib/redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BioAnalyticsResponse {
  stats: {
    totals: {
      views: number;
      uniqueVisitors: number;
      clicks: number;
    };
    data: {
      date: string;
      total_views: number;
      unique_visitors: number;
    }[];
  };
  locations: { location: string; hits: number; visits: number }[];
  referrers: { referrer: string; hits: number }[];
  devices: { device: string; hits: number }[];
  topBlocks: {
    blockId: string;
    blockType: string;
    clicks: number;
    submissions: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDateList(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return dateStr(d);
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * GET /api/bio/analytics/[galleryId]?days=7
 *
 * Returns analytics for a bio page. Auth-gated — only the gallery owner
 * can read their own analytics.
 *
 * View counts come from Redis (written by /api/bio/analytics/track and
 * the CF Worker flush cron). Click/reaction events come from Postgres.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { galleryId } = await params;

  // Verify ownership
  const gallery = await db.query.linkGallery.findFirst({
    where: and(eq(linkGallery.id, galleryId), eq(linkGallery.userId, dbUser.id)),
    columns: { id: true, createdAt: true },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  // Require at least 3 days of data
  const ageMs = Date.now() - new Date(gallery.createdAt).getTime();
  if (ageMs < 3 * 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: { code: "NOT_ENOUGH_DATA", message: "Not enough data yet. Check back in a few days." } },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "7", 10), 90);
  const since = daysAgo(days);
  const dates = buildDateList(days);

  // ── 1. Daily view + unique visitor counts from Redis ─────────────────────
  const viewKeys = dates.map((d) => `bio:views:${galleryId}:${d}`);
  const uniqueKeys = dates.map((d) => `bio:unique_views:${galleryId}:${d}`);

  const [viewValues, uniqueValues] = await Promise.all([
    redis.mget<(string | null)[]>(...viewKeys).catch(() => dates.map(() => null)),
    redis.mget<(string | null)[]>(...uniqueKeys).catch(() => dates.map(() => null)),
  ]);

  const dailyData = dates.map((date, i) => ({
    date,
    total_views: parseInt((viewValues[i] as string | null) ?? "0", 10) || 0,
    unique_visitors: parseInt((uniqueValues[i] as string | null) ?? "0", 10) || 0,
  }));

  const totalViews = dailyData.reduce((s, d) => s + d.total_views, 0);
  const totalUniqueVisitors = dailyData.reduce((s, d) => s + d.unique_visitors, 0);

  // ── 2. Total clicks from Postgres (block click events) ───────────────────
  const [clickRow] = await db
    .select({ total: count() })
    .from(linkGalleryBlockEvents)
    .where(
      and(
        eq(linkGalleryBlockEvents.galleryId, galleryId),
        eq(linkGalleryBlockEvents.eventType, "click"),
        gte(linkGalleryBlockEvents.createdAt, since)
      )
    );
  const totalClicks = Number(clickRow?.total ?? 0);

  // ── 2b. Per-block click + submission counts ───────────────────────────────
  const blockEventRows = await db
    .select({
      blockId: linkGalleryBlockEvents.blockId,
      blockType: linkGalleryBlockEvents.blockType,
      eventType: linkGalleryBlockEvents.eventType,
      total: count(),
    })
    .from(linkGalleryBlockEvents)
    .where(
      and(
        eq(linkGalleryBlockEvents.galleryId, galleryId),
        gte(linkGalleryBlockEvents.createdAt, since)
      )
    )
    .groupBy(
      linkGalleryBlockEvents.blockId,
      linkGalleryBlockEvents.blockType,
      linkGalleryBlockEvents.eventType
    );

  // Aggregate into per-block map
  const blockMap = new Map<
    string,
    { blockId: string; blockType: string; clicks: number; submissions: number }
  >();
  for (const row of blockEventRows) {
    const existing = blockMap.get(row.blockId) ?? {
      blockId: row.blockId,
      blockType: row.blockType,
      clicks: 0,
      submissions: 0,
    };
    if (row.eventType === "click") existing.clicks += Number(row.total);
    if (row.eventType === "submission") existing.submissions += Number(row.total);
    blockMap.set(row.blockId, existing);
  }

  const topBlocks = Array.from(blockMap.values())
    .sort((a, b) => b.clicks + b.submissions - (a.clicks + a.submissions))
    .slice(0, 10);

  // ── 3. Top locations from Redis ───────────────────────────────────────────
  // Scan bio:country:{galleryId}:{date}:{cc} keys for the date range
  const locationMap = new Map<string, number>();
  for (const date of dates) {
    // Use a pattern scan — limited to 20 countries per day to keep it fast
    const pattern = `bio:country:${galleryId}:${date}:*`;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const vals = await redis.mget<(string | null)[]>(...keys);
        keys.forEach((key, i) => {
          const cc = key.split(":").pop() ?? "XX";
          const count = parseInt((vals[i] as string | null) ?? "0", 10) || 0;
          locationMap.set(cc, (locationMap.get(cc) ?? 0) + count);
        });
      }
    } catch {}
  }

  const locations = Array.from(locationMap.entries())
    .filter(([cc]) => cc && cc !== "XX")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, hits]) => ({ location, hits, visits: hits }));

  // ── 4. Top referrers from Redis ───────────────────────────────────────────
  const referrerMap = new Map<string, number>();
  for (const date of dates) {
    const pattern = `bio:referrer:${galleryId}:${date}:*`;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const vals = await redis.mget<(string | null)[]>(...keys);
        keys.forEach((key, i) => {
          const host = key.split(":").slice(4).join(":"); // handle colons in hostname
          const count = parseInt((vals[i] as string | null) ?? "0", 10) || 0;
          if (host && host !== "direct") {
            referrerMap.set(host, (referrerMap.get(host) ?? 0) + count);
          }
        });
      }
    } catch {}
  }

  const referrers = Array.from(referrerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([referrer, hits]) => ({ referrer, hits }));

  // ── 5. Device breakdown from Redis ───────────────────────────────────────
  const deviceMap = new Map<string, number>();
  for (const date of dates) {
    const pattern = `bio:device:${galleryId}:${date}:*`;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const vals = await redis.mget<(string | null)[]>(...keys);
        keys.forEach((key, i) => {
          const device = key.split(":").pop() ?? "unknown";
          const count = parseInt((vals[i] as string | null) ?? "0", 10) || 0;
          deviceMap.set(device, (deviceMap.get(device) ?? 0) + count);
        });
      }
    } catch {}
  }

  const devices = Array.from(deviceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([device, hits]) => ({ device, hits }));

  // ── Response ──────────────────────────────────────────────────────────────
  const response: BioAnalyticsResponse = {
    stats: {
      totals: { views: totalViews, uniqueVisitors: totalUniqueVisitors, clicks: totalClicks },
      data: dailyData,
    },
    locations,
    referrers,
    devices,
    topBlocks,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=60" },
  });
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGallery, linkGalleryBlockEvents, linkGalleryBlocks, linkGalleryReactions } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { eq, and, gte, count, desc } from "drizzle-orm";
import { redis } from "@/lib/redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaitlistSubmission {
  email: string;
  createdAt: string;
  country: string | null;
  device: string | null;
}

export interface ReactionData {
  blockId: string;
  blockType: string;
  emoji: string;
  total: number;
  // time-series: per-day counts within the requested window
  daily: { date: string; count: number }[];
}

export interface BlockDetail {
  blockId: string;
  blockType: string;
  blockName: string | null;
  clicks: number;
  submissions: number;
  reactions: number;
  // waitlist-email specific
  waitlistSubmissions?: WaitlistSubmission[];
}

export interface BioAnalyticsResponse {
  stats: {
    totals: {
      views: number;
      uniqueVisitors: number;
      clicks: number;
      submissions: number;
      reactions: number;
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
  // New: rich per-block details with inline data
  blockDetails: BlockDetail[];
  // New: reaction analytics per reaction block
  reactionBlocks: ReactionData[];
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

  // Require at least 3 days of data in production; skip in dev so you can
  // see analytics immediately without waiting 3 days.
  const ageMs = Date.now() - new Date(gallery.createdAt).getTime();
  if (process.env.NODE_ENV === "production" && ageMs < 3 * 24 * 60 * 60 * 1000) {
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

  // ── 2. All block events (clicks, submissions, reactions) ─────────────────
  const blockEventRows = await db
    .select({
      blockId: linkGalleryBlockEvents.blockId,
      blockType: linkGalleryBlockEvents.blockType,
      eventType: linkGalleryBlockEvents.eventType,
      metadata: linkGalleryBlockEvents.metadata,
      country: linkGalleryBlockEvents.country,
      device: linkGalleryBlockEvents.device,
      createdAt: linkGalleryBlockEvents.createdAt,
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
      linkGalleryBlockEvents.eventType,
      linkGalleryBlockEvents.metadata,
      linkGalleryBlockEvents.country,
      linkGalleryBlockEvents.device,
      linkGalleryBlockEvents.createdAt,
    );

  // ── 3. Get all blocks for this gallery with their names ──────────────────
  const galleryBlocks = await db
    .select({
      id: linkGalleryBlocks.id,
      type: linkGalleryBlocks.type,
      config: linkGalleryBlocks.config,
    })
    .from(linkGalleryBlocks)
    .where(eq(linkGalleryBlocks.galleryId, galleryId));

  const blockConfigMap = new Map(galleryBlocks.map((b) => [b.id, b]));

  // Helper to extract a human name from a block's config
  function blockName(blockId: string): string | null {
    const b = blockConfigMap.get(blockId);
    if (!b) return null;
    const cfg = b.config as Record<string, unknown>;
    return (cfg.title as string) ?? (cfg.name as string) ?? null;
  }

  // ── 4. Aggregate block events ─────────────────────────────────────────────
  const blockMap = new Map<
    string,
    {
      blockId: string;
      blockType: string;
      clicks: number;
      submissions: number;
      reactions: number;
      waitlistEmails: Map<string, WaitlistSubmission>;
    }
  >();

  for (const row of blockEventRows) {
    const existing = blockMap.get(row.blockId) ?? {
      blockId: row.blockId,
      blockType: row.blockType,
      clicks: 0,
      submissions: 0,
      reactions: 0,
      waitlistEmails: new Map(),
    };

    const rowTotal = Number(row.total);
    if (row.eventType === "click") existing.clicks += rowTotal;
    if (row.eventType === "reaction") existing.reactions += rowTotal;
    if (row.eventType === "submission") {
      existing.submissions += 1;
      // Extract email from metadata for waitlist blocks
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const email = typeof meta.email === "string" ? meta.email.toLowerCase().trim() : null;
      if (email && !existing.waitlistEmails.has(email)) {
        existing.waitlistEmails.set(email, {
          email,
          createdAt: row.createdAt.toISOString(),
          country: row.country ?? null,
          device: row.device ?? null,
        });
      }
    }

    blockMap.set(row.blockId, existing);
  }

  const totalClicks = Array.from(blockMap.values()).reduce((s, b) => s + b.clicks, 0);
  const totalSubmissions = Array.from(blockMap.values()).reduce((s, b) => s + b.submissions, 0);

  const topBlocks = Array.from(blockMap.values())
    .sort((a, b) => b.clicks + b.submissions - (a.clicks + a.submissions))
    .slice(0, 10)
    .map((b) => ({ blockId: b.blockId, blockType: b.blockType, clicks: b.clicks, submissions: b.submissions }));

  // Build blockDetails with waitlist submissions inline
  const blockDetails: BlockDetail[] = Array.from(blockMap.values()).map((b) => {
    const detail: BlockDetail = {
      blockId: b.blockId,
      blockType: b.blockType,
      blockName: blockName(b.blockId),
      clicks: b.clicks,
      submissions: b.submissions,
      reactions: b.reactions,
    };
    if (b.blockType === "waitlist-email" && b.waitlistEmails.size > 0) {
      detail.waitlistSubmissions = Array.from(b.waitlistEmails.values())
        .sort((a, z) => z.createdAt.localeCompare(a.createdAt));
    }
    return detail;
  });

  // ── 5. Reaction blocks data from linkGalleryReactions ────────────────────
  const reactionBlockIds = galleryBlocks
    .filter((b) => b.type === "reaction")
    .map((b) => b.id);

  const reactionBlocks: ReactionData[] = [];

  for (const rBlockId of reactionBlockIds) {
    const [totalRow] = await db
      .select({ emoji: linkGalleryReactions.emoji, total: count() })
      .from(linkGalleryReactions)
      .where(
        and(
          eq(linkGalleryReactions.blockId, rBlockId),
          gte(linkGalleryReactions.createdAt, since)
        )
      )
      .groupBy(linkGalleryReactions.emoji);

    // Daily reaction counts for chart
    const dailyCounts: { date: string; count: number }[] = dates.map((date) => ({ date, count: 0 }));
    const dailyRows = await db
      .select({ createdAt: linkGalleryReactions.createdAt })
      .from(linkGalleryReactions)
      .where(
        and(
          eq(linkGalleryReactions.blockId, rBlockId),
          gte(linkGalleryReactions.createdAt, since)
        )
      );

    for (const r of dailyRows) {
      const d = dateStr(r.createdAt);
      const entry = dailyCounts.find((x) => x.date === d);
      if (entry) entry.count += 1;
    }

    const totalReactions = Number(totalRow?.total ?? 0);
    if (totalReactions > 0 || reactionBlockIds.length > 0) {
      reactionBlocks.push({
        blockId: rBlockId,
        blockType: "reaction",
        emoji: totalRow?.emoji ?? "love",
        total: totalReactions,
        daily: dailyCounts,
      });
    }
  }

  // Total reactions across all reaction blocks
  const totalReactions = reactionBlocks.reduce((s, b) => s + b.total, 0);

  // ── 6. Top locations from Redis ───────────────────────────────────────────
  const locationMap = new Map<string, number>();
  for (const date of dates) {
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
    .filter(([cc]) => cc && cc.length > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, hits]) => ({
      location: location === "XX" ? "Unknown" : location,
      hits,
      visits: hits,
    }));

  // ── 7. Top referrers from Redis ───────────────────────────────────────────
  const referrerMap = new Map<string, number>();
  for (const date of dates) {
    const pattern = `bio:referrer:${galleryId}:${date}:*`;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const vals = await redis.mget<(string | null)[]>(...keys);
        keys.forEach((key, i) => {
          const host = key.split(":").slice(4).join(":");
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

  // ── 8. Device breakdown from Redis ───────────────────────────────────────
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
      totals: {
        views: totalViews,
        uniqueVisitors: totalUniqueVisitors,
        clicks: totalClicks,
        submissions: totalSubmissions,
        reactions: totalReactions,
      },
      data: dailyData,
    },
    locations,
    referrers,
    devices,
    topBlocks,
    blockDetails,
    reactionBlocks,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" },
  });
}

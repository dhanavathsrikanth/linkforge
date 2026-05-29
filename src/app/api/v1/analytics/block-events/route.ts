import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGallery, linkGalleryBlockEvents } from "@/lib/db";
import { sql, eq, and, gte, lte, count, desc } from "drizzle-orm";

function getDateRange(range: string, from?: string, to?: string) {
  const end = range === "custom" && to ? new Date(to) : new Date();
  let start: Date;
  if (range === "custom" && from) {
    start = new Date(from);
  } else {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    start = new Date();
    start.setDate(start.getDate() - days);
  }
  return { start, end };
}

// GET /api/v1/analytics/block-events — block interaction analytics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const galleryId = searchParams.get("galleryId");
    const range = searchParams.get("range") || "30d";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!galleryId) return NextResponse.json({ error: "galleryId is required" }, { status: 400 });

    const gallery = await db.query.linkGallery.findFirst({
      where: eq(linkGallery.id, galleryId),
    });
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    const { start, end } = getDateRange(range, from, to);
    const conditions = and(
      eq(linkGalleryBlockEvents.galleryId, galleryId),
      gte(linkGalleryBlockEvents.createdAt, start),
      lte(linkGalleryBlockEvents.createdAt, end)
    );

    // Total events
    const [totalRow] = await db
      .select({ total: count() })
      .from(linkGalleryBlockEvents)
      .where(conditions);

    // Break down by block type
    const byBlockType = await db
      .select({
        blockType: linkGalleryBlockEvents.blockType,
        total: sql<number>`count(*)::int`,
      })
      .from(linkGalleryBlockEvents)
      .where(conditions)
      .groupBy(linkGalleryBlockEvents.blockType)
      .orderBy(desc(sql`count(*)`));

    // Break down by event type
    const byEventType = await db
      .select({
        eventType: linkGalleryBlockEvents.eventType,
        total: sql<number>`count(*)::int`,
      })
      .from(linkGalleryBlockEvents)
      .where(conditions)
      .groupBy(linkGalleryBlockEvents.eventType)
      .orderBy(desc(sql`count(*)`));

    // Break down by individual block
    const byBlock = await db
      .select({
        blockId: linkGalleryBlockEvents.blockId,
        blockType: linkGalleryBlockEvents.blockType,
        total: sql<number>`count(*)::int`,
      })
      .from(linkGalleryBlockEvents)
      .where(conditions)
      .groupBy(linkGalleryBlockEvents.blockId, linkGalleryBlockEvents.blockType)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Time series (daily)
    const timeSeries = await db
      .select({
        date: sql<string>`DATE(${linkGalleryBlockEvents.createdAt})::text`,
        total: sql<number>`count(*)::int`,
      })
      .from(linkGalleryBlockEvents)
      .where(conditions)
      .groupBy(sql`DATE(${linkGalleryBlockEvents.createdAt})`)
      .orderBy(sql`DATE(${linkGalleryBlockEvents.createdAt})`);

    // Unique IPs (approximate unique visitors)
    const [uniqueRow] = await db
      .select({ unique: sql<number>`count(distinct ${linkGalleryBlockEvents.ip})::int` })
      .from(linkGalleryBlockEvents)
      .where(conditions);

    return NextResponse.json({
      totalEvents: totalRow?.total ?? 0,
      uniqueVisitors: uniqueRow?.unique ?? 0,
      byBlockType,
      byEventType,
      byBlock,
      timeSeries,
    });
  } catch (error) {
    console.error("Block events analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

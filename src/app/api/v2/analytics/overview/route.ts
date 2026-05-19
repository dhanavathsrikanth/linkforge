import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

function getDateRange(
  range: string,
  from?: string,
  to?: string
): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  let end: Date;
  let start: Date;
  let previousEnd: Date;
  let previousStart: Date;

  if (range === "custom" && from && to) {
    start = new Date(from);
    end = new Date(to);
    const diff = end.getTime() - start.getTime();
    previousEnd = new Date(start.getTime() - 1);
    previousStart = new Date(previousEnd.getTime() - diff);
  } else {
    end = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
    start = new Date();
    start.setDate(start.getDate() - days);
    previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - days);
  }

  return { start, end, previousStart, previousEnd };
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const linkId = searchParams.get("linkId") || undefined;

  const { start, end, previousStart, previousEnd } = getDateRange(range, from, to);

  const clickWhere = linkId
    ? and(
        eq(clicks.workspaceId, auth.workspaceId),
        eq(clicks.linkId, linkId),
        gte(clicks.createdAt, start),
        lte(clicks.createdAt, end)
      )
    : and(
        eq(clicks.workspaceId, auth.workspaceId),
        gte(clicks.createdAt, start),
        lte(clicks.createdAt, end)
      );

  const prevClickWhere = linkId
    ? and(
        eq(clicks.workspaceId, auth.workspaceId),
        eq(clicks.linkId, linkId),
        gte(clicks.createdAt, previousStart),
        lte(clicks.createdAt, previousEnd)
      )
    : and(
        eq(clicks.workspaceId, auth.workspaceId),
        gte(clicks.createdAt, previousStart),
        lte(clicks.createdAt, previousEnd)
      );

  const [currentCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clicks)
    .where(clickWhere);

  const [previousCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clicks)
    .where(prevClickWhere);

  const totalClicks = currentCount?.total || 0;
  const prevTotal = previousCount?.total || 0;
  const clicksGrowth = prevTotal > 0 ? Math.round(((totalClicks - prevTotal) / prevTotal) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clicks)
    .where(
      and(
        eq(clicks.workspaceId, auth.workspaceId),
        gte(clicks.createdAt, today)
      )
    );
  const clicksToday = todayCount?.total || 0;

  const [uniqueResult] = await db
    .select({ unique: sql<number>`count(distinct ${clicks.ip})::int` })
    .from(clicks)
    .where(clickWhere);
  const uniqueClicks = uniqueResult?.unique || 0;

  const [topLinkData] = await db
    .select({
      linkId: clicks.linkId,
      slug: links.slug,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .leftJoin(links, eq(clicks.linkId, links.id))
    .where(clickWhere)
    .groupBy(clicks.linkId, links.slug)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const topLink = topLinkData?.linkId
    ? { id: topLinkData.linkId, slug: topLinkData.slug || "unknown", clicks: topLinkData.clicks }
    : null;

  const [topCountryData] = await db
    .select({
      country: clicks.country,
      count: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(clickWhere)
    .groupBy(clicks.country)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
  const topCountry = topCountryData?.country || "Unknown";

  const [topDeviceData] = await db
    .select({
      device: clicks.device,
      count: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(clickWhere)
    .groupBy(clicks.device)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
  const topDevice = topDeviceData?.device || "unknown";

  return NextResponse.json({
    data: {
      totalClicks,
      uniqueClicks,
      clicksToday,
      clicksGrowth,
      topLink,
      topCountry,
      topDevice,
    },
  });
}

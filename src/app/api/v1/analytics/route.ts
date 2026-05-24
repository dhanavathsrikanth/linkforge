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
  const end = (from && to) ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date();
  if (!from) {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
    start.setDate(start.getDate() - days);
  }
  const diff = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - diff);
  return { start, end, previousStart, previousEnd };
}

function buildWhere(workspaceId: string, start?: Date, end?: Date, linkId?: string) {
  const conditions = [eq(clicks.workspaceId, workspaceId)];
  if (linkId) conditions.push(eq(clicks.linkId, linkId));
  if (start) conditions.push(gte(clicks.createdAt, start));
  if (end) conditions.push(lte(clicks.createdAt, end));
  return and(...conditions);
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const groupBy = searchParams.get("groupBy") || undefined;
  const linkId = searchParams.get("linkId") || undefined;

  const { start, end, previousStart, previousEnd } = getDateRange(range, from, to);

  const [currentCount] = await db
    .select({ total: sql<number>`count(*)::int`, unique: sql<number>`count(distinct ${clicks.ip})::int` })
    .from(clicks)
    .where(buildWhere(auth.workspaceId, start, end, linkId));

  const [prevCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clicks)
    .where(buildWhere(auth.workspaceId, previousStart, previousEnd, linkId));

  const totalClicks = currentCount?.total || 0;
  const uniqueClicks = currentCount?.unique || 0;
  const prevTotal = prevCount?.total || 0;
  const clicksGrowth = prevTotal > 0 ? Math.round(((totalClicks - prevTotal) / prevTotal) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clicks)
    .where(buildWhere(auth.workspaceId, today, undefined, linkId));

  let topLinkData: { id: string; slug: string; clicks: number } | null = null;
  if (!linkId) {
    const [top] = await db
      .select({
        linkId: clicks.linkId,
        slug: links.slug,
        clicks: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .leftJoin(links, eq(clicks.linkId, links.id))
      .where(buildWhere(auth.workspaceId, start, end))
      .groupBy(clicks.linkId, links.slug)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    if (top?.linkId) {
      topLinkData = { id: top.linkId, slug: top.slug || "unknown", clicks: top.clicks };
    }
  }

  const [topCountry] = await db
    .select({ country: clicks.country, count: sql<number>`count(*)::int` })
    .from(clicks)
    .where(buildWhere(auth.workspaceId, start, end, linkId))
    .groupBy(clicks.country)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const [topDevice] = await db
    .select({ device: clicks.device, count: sql<number>`count(*)::int` })
    .from(clicks)
    .where(buildWhere(auth.workspaceId, start, end, linkId))
    .groupBy(clicks.device)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  let averageCTR = 0;
  if (!linkId) {
    const linkStats = await db
      .select({ clicks: links.totalClicks })
      .from(links)
      .where(eq(links.workspaceId, auth.workspaceId));
    const withClicks = linkStats.filter((l) => l.clicks > 0);
    averageCTR = withClicks.length > 0
      ? Math.round((withClicks.reduce((s, l) => s + l.clicks, 0) / withClicks.length) * 100) / 100
      : 0;
  }

  return NextResponse.json({
    data: {
      totalClicks,
      uniqueClicks,
      clicksToday: todayCount?.total || 0,
      clicksGrowth,
      topLink: topLinkData,
      averageCTR,
      topCountry: topCountry?.country || "Unknown",
      topDevice: topDevice?.device || "unknown",
    },
  });
}

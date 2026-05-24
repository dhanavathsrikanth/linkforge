import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links, conversions } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

function getDateRange(
  range: string,
  from?: string,
  to?: string
): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  let end: Date;
  let start: Date;

  if (range === "custom" && from && to) {
    start = new Date(from);
    end = new Date(to);
  } else {
    end = new Date();
    const days = range === "1h" ? 0 : range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : range === "365d" ? 365 : 30;
    start = new Date();
    start.setDate(start.getDate() - days);
  }

  const diff = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - diff);

  return { start, end, previousStart, previousEnd };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { id: linkId } = await params;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const groupBy = searchParams.get("groupBy") || "day";

  const link = await db.query.links.findFirst({
    where: and(eq(links.id, linkId), eq(links.workspaceId, auth.workspaceId)),
  });
  if (!link) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Link not found." } },
      { status: 404 }
    );
  }

  const { start, end, previousStart, previousEnd } = getDateRange(range, from, to);

  const where = and(eq(clicks.linkId, linkId), gte(clicks.createdAt, start), lte(clicks.createdAt, end));
  const prevWhere = and(eq(clicks.linkId, linkId), gte(clicks.createdAt, previousStart), lte(clicks.createdAt, previousEnd));

  const [clickCount] = await db
    .select({ total: sql<number>`count(*)::int`, unique: sql<number>`count(distinct ${clicks.ip})::int` })
    .from(clicks)
    .where(where);

  const [prevCount] = await db
    .select({ total: sql<number>`count(*)::int`, unique: sql<number>`count(distinct ${clicks.ip})::int` })
    .from(clicks)
    .where(prevWhere);

  const [convCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversions)
    .where(and(eq(conversions.linkId, linkId), gte(conversions.createdAt, start), lte(conversions.createdAt, end)));

  const totalClicks = clickCount?.total || 0;
  const uniqueClicks = clickCount?.unique || 0;
  const totalConversions = convCount?.total || 0;
  const conversionRate = totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

  const timeSeriesData = await db
    .select({
      label: groupBy === "hour"
        ? sql<string>`to_char(${clicks.createdAt}, 'YYYY-MM-DD HH24:00')`
        : groupBy === "week"
          ? sql<string>`to_char(${clicks.createdAt}, 'YYYY-WW')`
          : groupBy === "month"
            ? sql<string>`to_char(${clicks.createdAt}, 'YYYY-MM')`
            : sql<string>`to_char(${clicks.createdAt}, 'YYYY-MM-DD')`,
      clicks: sql<number>`count(*)::int`,
      unique: sql<number>`count(distinct ${clicks.ip})::int`,
    })
    .from(clicks)
    .where(where)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const geoData = await db
    .select({
      country: clicks.country,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(and(where, sql`${clicks.country} is not null`))
    .groupBy(clicks.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const totalWithGeo = geoData.reduce((s, r) => s + r.clicks, 0);

  const deviceData = await db
    .select({
      device: clicks.device,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(and(where, sql`${clicks.device} is not null and ${clicks.device} != 'unknown'`))
    .groupBy(clicks.device)
    .orderBy(desc(sql`count(*)`));

  const totalWithDevices = deviceData.reduce((s, r) => s + r.clicks, 0);

  const browserData = await db
    .select({
      browser: clicks.browser,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(and(where, sql`${clicks.browser} is not null`))
    .groupBy(clicks.browser)
    .orderBy(desc(sql`count(*)`));

  const referrerData = await db
    .select({
      referrer: clicks.referrerDomain,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(and(where, sql`${clicks.referrerDomain} is not null`))
    .groupBy(clicks.referrerDomain)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return NextResponse.json({
    data: {
      summary: {
        totalClicks,
        uniqueClicks,
        totalConversions,
        conversionRate,
        comparedToPrevious: {
          clicks: prevCount?.total || 0,
          uniqueClicks: prevCount?.unique || 0,
        },
      },
      timeSeries: {
        labels: timeSeriesData.map((r) => r.label),
        clicks: timeSeriesData.map((r) => r.clicks),
        uniqueClicks: timeSeriesData.map((r) => r.unique),
      },
      geography: {
        byCountry: geoData.map((r) => ({
          country: r.country || "Unknown",
          clicks: r.clicks,
          percentage: totalWithGeo > 0 ? parseFloat(((r.clicks / totalWithGeo) * 100).toFixed(1)) : 0,
        })),
      },
      devices: {
        byDeviceType: deviceData.map((r) => ({
          type: r.device,
          clicks: r.clicks,
          percentage: totalWithDevices > 0 ? parseFloat(((r.clicks / totalWithDevices) * 100).toFixed(1)) : 0,
        })),
      },
      browsers: {
        byBrowser: browserData.map((r) => ({
          browser: r.browser,
          clicks: r.clicks,
          percentage: 0,
        })),
      },
      referrers: {
        byType: referrerData.map((r) => ({
          type: r.referrer || "direct",
          clicks: r.clicks,
        })),
      },
      abTestResults: null,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, links, users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, count, desc } from "drizzle-orm";

interface OverviewResponse {
  totalClicks: number;
  uniqueClicks: number;
  clicksToday: number;
  clicksGrowth: number;
  deepLinkClicks: number;
  topLink: {
    id: string;
    slug: string;
    clicks: number;
  } | null;
  averageCTR: number;
  topCountry: string;
  topCountryCount: number;
  topDevice: string;
  topDeviceCount: number;
  // Per-QR analytics — derived from the `?source=qr` redirect parameter.
  qrScans: number;
  qrScansToday: number;
  qrScanGrowth: number;
}

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

function buildWhere(workspaceId: string, linkId?: string, start?: Date, end?: Date, qrOnly?: boolean) {
  const conditions = [eq(clicks.workspaceId, workspaceId)];
  if (linkId) conditions.push(eq(clicks.linkId, linkId));
  if (start) conditions.push(gte(clicks.createdAt, start));
  if (end) conditions.push(lte(clicks.createdAt, end));
  if (qrOnly) conditions.push(eq(clicks.isQrScan, true));
  return and(...conditions);
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const linkId = searchParams.get("linkId") || undefined;
    const range = searchParams.get("range") || "30d";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const source = searchParams.get("source") || undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!workspace || !dbUser) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Allow access if user is owner OR a workspace member
    if (workspace.ownerId !== dbUser.id) {
      const [membership] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, dbUser.id)
          )
        )
        .limit(1);
      if (!membership) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
    }

    const { start, end, previousStart, previousEnd } = getDateRange(range, from, to);
    // source=qr scopes the entire response to QR-scans-only.
    const qrOnly = source === "qr";

    const currentClicks = await db
      .select({ totalClicks: count() })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, start, end, qrOnly));

    const previousClicks = await db
      .select({ totalClicks: count() })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, previousStart, previousEnd, qrOnly));

    const totalClicks = currentClicks[0]?.totalClicks || 0;
    const previousTotalClicks = previousClicks[0]?.totalClicks || 0;

    let clicksGrowth = 0;
    if (previousTotalClicks > 0) {
      clicksGrowth = Math.round(((totalClicks - previousTotalClicks) / previousTotalClicks) * 100);
    } else if (totalClicks > 0) {
      // New link with no prior period — show 100% to indicate growth from zero
      clicksGrowth = 100;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayClicks = await db
      .select({ totalClicks: count() })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, today, undefined, qrOnly));

    const clicksToday = todayClicks[0]?.totalClicks || 0;

    const uniqueClicksResult = await db
      .select({ uniqueClicks: sql<number>`count(distinct ${clicks.ip})` })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, start, end, qrOnly));

    const uniqueClicks = uniqueClicksResult[0]?.uniqueClicks || 0;

    const deepLinkResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clicks)
      .where(and(buildWhere(workspaceId, linkId, start, end, qrOnly), eq(clicks.isDeepLink, true)));

    const deepLinkClicks = deepLinkResult[0]?.count || 0;

    let topLink: OverviewResponse["topLink"] = null;
    if (!linkId) {
      const topLinkData = await db
        .select({
          linkId: clicks.linkId,
          slug: links.slug,
          clicks: sql<number>`count(*)::int`,
        })
        .from(clicks)
        .leftJoin(links, eq(clicks.linkId, links.id))
        .where(buildWhere(workspaceId, undefined, start, end, qrOnly))
        .groupBy(clicks.linkId, links.slug)
        .orderBy(desc(sql`count(*)`))
        .limit(1);

      if (topLinkData[0]?.linkId) {
        const linkDetails = await db.query.links.findFirst({
          where: eq(links.id, topLinkData[0].linkId),
        });
        topLink = {
          id: topLinkData[0].linkId,
          slug: linkDetails?.slug || topLinkData[0].slug || "unknown",
          clicks: topLinkData[0].clicks,
        };
      }
    }

    const topCountryData = await db
      .select({
        country: clicks.country,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(and(
        buildWhere(workspaceId, linkId, start, end, qrOnly),
        sql`${clicks.country} IS NOT NULL`,
        sql`${clicks.country} != 'XX'`,
        sql`${clicks.country} != 'Unknown'`,
      ))
      .groupBy(clicks.country)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const rawCountry = topCountryData[0]?.country;
    const topCountry = (!rawCountry || rawCountry === "XX" || rawCountry === "Unknown") ? "Unknown" : rawCountry;
    const topCountryCount = topCountryData[0]?.count || 0;

    const topDeviceData = await db
      .select({
        device: clicks.device,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(and(
        buildWhere(workspaceId, linkId, start, end, qrOnly),
        sql`${clicks.device} IS NOT NULL`,
        sql`${clicks.device} != 'unknown'`,
        sql`${clicks.device} != 'bot'`,
      ))
      .groupBy(clicks.device)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const topDevice = topDeviceData[0]?.device === "bot" ? "unknown" : (topDeviceData[0]?.device || "unknown");
    const topDeviceCount = topDeviceData[0]?.count || 0;

    // ── Per-QR analytics ───────────────────────────────────────────────
    // Scans carry the `isQrScan = true` flag because the QR links embed
    // ?source=qr which the redirect handler (s/[slug]/route.ts) sets on the
    // click row. We read both the current period and the previous one so
    // the dashboard can show "QR scan growth" alongside total-clicks growth.
    // When the caller already passed source=qr, these are the same numbers
    // as the totals above, so we skip the second query to save a round trip.
    let qrScans = 0;
    let previousQrScans = 0;
    let qrScansToday = 0;
    if (qrOnly) {
      qrScans = totalClicks;
      previousQrScans = previousTotalClicks;
      qrScansToday = clicksToday;
    } else {
      const currentQr = await db
        .select({ total: count() })
        .from(clicks)
        .where(buildWhere(workspaceId, linkId, start, end, true));
      const previousQr = await db
        .select({ total: count() })
        .from(clicks)
        .where(buildWhere(workspaceId, linkId, previousStart, previousEnd, true));

      qrScans = currentQr[0]?.total || 0;
      previousQrScans = previousQr[0]?.total || 0;

      const todayQr = await db
        .select({ total: count() })
        .from(clicks)
        .where(buildWhere(workspaceId, linkId, today, undefined, true));
      qrScansToday = todayQr[0]?.total || 0;
    }
    let qrScanGrowth = 0;
    if (previousQrScans > 0) {
      qrScanGrowth = Math.round(((qrScans - previousQrScans) / previousQrScans) * 100);
    } else if (qrScans > 0) {
      qrScanGrowth = 100;
    }

    let averageCTR = 0;
    if (!linkId) {
      const linksWithClicks = await db
        .select({ totalClicks: links.totalClicks })
        .from(links)
        .where(eq(links.workspaceId, workspaceId));

      let totalLinkClicks = 0;
      let linkCount = 0;
      for (const link of linksWithClicks) {
        if (link.totalClicks > 0) {
          totalLinkClicks += link.totalClicks;
          linkCount++;
        }
      }
      averageCTR = linkCount > 0 ? Math.round((totalLinkClicks / linkCount) * 100) / 100 : 0;
    }

    const response: OverviewResponse = {
      totalClicks,
      uniqueClicks,
      clicksToday,
      clicksGrowth,
      deepLinkClicks,
      topLink,
      averageCTR,
      topCountry,
      topCountryCount,
      topDevice,
      topDeviceCount,
      qrScans,
      qrScansToday,
      qrScanGrowth,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

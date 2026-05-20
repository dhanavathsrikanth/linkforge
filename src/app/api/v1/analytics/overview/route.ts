import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, links, users, workspaces } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, count, desc } from "drizzle-orm";

interface OverviewResponse {
  totalClicks: number;
  uniqueClicks: number;
  clicksToday: number;
  clicksGrowth: number;
  topLink: {
    id: string;
    slug: string;
    clicks: number;
  } | null;
  averageCTR: number;
  topCountry: string;
  topDevice: string;
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

function buildWhere(workspaceId: string, linkId?: string, start?: Date, end?: Date) {
  const conditions = [eq(clicks.workspaceId, workspaceId)];
  if (linkId) conditions.push(eq(clicks.linkId, linkId));
  if (start) conditions.push(gte(clicks.createdAt, start));
  if (end) conditions.push(lte(clicks.createdAt, end));
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

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!workspace || !dbUser || workspace.ownerId !== dbUser.id) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { start, end, previousStart, previousEnd } = getDateRange(range, from, to);

    const currentClicks = await db
      .select({ totalClicks: count() })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, start, end));

    const previousClicks = await db
      .select({ totalClicks: count() })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, previousStart, previousEnd));

    const totalClicks = currentClicks[0]?.totalClicks || 0;
    const previousTotalClicks = previousClicks[0]?.totalClicks || 0;

    let clicksGrowth = 0;
    if (previousTotalClicks > 0) {
      clicksGrowth = Math.round(((totalClicks - previousTotalClicks) / previousTotalClicks) * 100);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayClicks = await db
      .select({ totalClicks: count() })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, today));

    const clicksToday = todayClicks[0]?.totalClicks || 0;

    const uniqueClicksResult = await db
      .select({ uniqueClicks: sql<number>`count(distinct ${clicks.ip})` })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, start, end));

    const uniqueClicks = uniqueClicksResult[0]?.uniqueClicks || 0;

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
        .where(buildWhere(workspaceId, undefined, start, end))
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
      .where(buildWhere(workspaceId, linkId, start, end))
      .groupBy(clicks.country)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const topCountry = topCountryData[0]?.country || "Unknown";

    const topDeviceData = await db
      .select({
        device: clicks.device,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(buildWhere(workspaceId, linkId, start, end))
      .groupBy(clicks.device)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const topDevice = topDeviceData[0]?.device || "unknown";

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
      topLink,
      averageCTR,
      topCountry,
      topDevice,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, links, workspaces, domains } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";
import { getDefaultDomain } from "@/lib/utils";

interface TopLinkData {
  id: string;
  title: string;
  slug: string;
  domain: string;
  url: string;
  clicks: number;
  uniqueClicks: number;
  ctr: number;
  createdAt: string;
  trend: number[];
}

function getDateRange(
  range: string,
  from?: string,
  to?: string
): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const now = new Date();
  const end = now;

  if (range === "custom" && from && to) {
    const start = new Date(from);
    const customEnd = new Date(to);
    const diff = customEnd.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - diff);
    return { start, end: customEnd, previousStart, previousEnd };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days);

  return { start, end, previousStart, previousEnd };
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const range = searchParams.get("range") || "7d";
    const limit = parseInt(searchParams.get("limit") || "10");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify workspace ownership
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { start, end } = getDateRange(range, from, to);

    // Get clicks grouped by link for the current period
    const linkClicks = await db
      .select({
        linkId: clicks.linkId,
        clicks: sql<number>`count(*)::int`,
        uniqueClicks: sql<number>`count(distinct ${clicks.ip})::int`,
      })
      .from(clicks)
      .where(
        and(
          eq(clicks.workspaceId, workspaceId),
          gte(clicks.createdAt, start),
          lte(clicks.createdAt, end)
        )
      )
      .groupBy(clicks.linkId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    // Get link details and calculate 7-day trend for each
    const result: TopLinkData[] = [];

    for (const clickData of linkClicks) {
      const link = await db.query.links.findFirst({
        where: eq(links.id, clickData.linkId),
      });

      if (!link) continue;

      // Get domain info
      const domain = link.domainId
        ? await db.query.domains.findFirst({
            where: eq(domains.id, link.domainId),
          })
        : null;

      // Get 7-day trend (last 7 days of the selected period)
      const trendStart = new Date(end);
      trendStart.setDate(trendStart.getDate() - 7);
      
      const dailyClicks = await db
        .select({
          date: sql<string>`date_trunc('day', ${clicks.createdAt})`,
          clicks: sql<number>`count(*)::int`,
        })
        .from(clicks)
        .where(
          and(
            eq(clicks.linkId, clickData.linkId),
            gte(clicks.createdAt, trendStart),
            lte(clicks.createdAt, end)
          )
        )
        .groupBy(sql`date_trunc('day', ${clicks.createdAt})`)
        .orderBy(sql`date_trunc('day', ${clicks.createdAt})`);

      // Fill in missing days with 0
      const trend: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const match = dailyClicks.find(row => 
          new Date(row.date).toISOString().split("T")[0] === dateStr
        );
        trend.push(match ? match.clicks : 0);
      }

      // Calculate CTR (clicks / link's total clicks)
      const ctr = link.totalClicks > 0 
        ? Math.round((clickData.clicks / link.totalClicks) * 10000) / 100 
        : 0;

      result.push({
        id: link.id,
        title: link.title || link.slug,
        slug: link.slug,
        domain: domain?.domain || getDefaultDomain(),
        url: link.destination || "",
        clicks: clickData.clicks,
        uniqueClicks: clickData.uniqueClicks,
        ctr,
        createdAt: link.createdAt?.toISOString() || "",
        trend,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics top-links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
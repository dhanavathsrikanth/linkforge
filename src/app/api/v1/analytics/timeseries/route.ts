import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, workspaces } from "@/lib/db/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";

interface TimeSeriesData {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

function getDateRange(
  range: string,
  from?: string,
  to?: string
): { start: Date; end: Date } {
  const now = new Date();
  const end = now;

  if (range === "custom" && from && to) {
    return { start: new Date(from), end: new Date(to) };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date();
  start.setDate(start.getDate() - days);

  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
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
    const range = searchParams.get("range") || "7d";
    const groupBy = searchParams.get("groupBy") || "day";
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

    // Determine the date truncation based on groupBy
    const truncateFunc = groupBy === "hour" ? "hour" : "day";

    // Build the query
    const baseWhere = linkId
      ? and(
          eq(clicks.workspaceId, workspaceId),
          eq(clicks.linkId, linkId),
          gte(clicks.createdAt, start),
          lte(clicks.createdAt, end)
        )
      : and(
          eq(clicks.workspaceId, workspaceId),
          gte(clicks.createdAt, start),
          lte(clicks.createdAt, end)
        );

    // Get total clicks per period
    const clicksData = await db
      .select({
        period: sql<string>`date_trunc('${sql.raw(truncateFunc)}', ${clicks.createdAt})`,
        clicks: sql<number>`count(*)::int`,
        uniqueClicks: sql<number>`count(distinct ${clicks.ip})::int`,
      })
      .from(clicks)
      .where(baseWhere)
      .groupBy(sql`date_trunc('${sql.raw(truncateFunc)}', ${clicks.createdAt})`)
      .orderBy(sql`date_trunc('${sql.raw(truncateFunc)}', ${clicks.createdAt})`);

    // Fill in missing periods with 0 clicks
    const result: TimeSeriesData[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const periodStr = current.toISOString();
      const match = clicksData.find(row => {
        const rowDate = new Date(row.period).toISOString();
        if (groupBy === "hour") {
          // Match by hour
          return rowDate.substring(0, 13) === periodStr.substring(0, 13);
        }
        // Match by day
        return rowDate.split("T")[0] === periodStr.split("T")[0];
      });

      result.push({
        date: groupBy === "hour" 
          ? new Date(current).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" })
          : new Date(current).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        clicks: match?.clicks || 0,
        uniqueClicks: match?.uniqueClicks || 0,
      });

      if (groupBy === "hour") {
        current.setHours(current.getHours() + 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics timeseries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
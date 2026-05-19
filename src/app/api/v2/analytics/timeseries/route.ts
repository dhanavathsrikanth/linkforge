import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { sql, eq, and, gte, lte } from "drizzle-orm";

function getDateRange(range: string, from?: string, to?: string): { start: Date; end: Date } {
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to) };
  const end = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get("linkId") || undefined;
  const range = searchParams.get("range") || "7d";
  const groupBy = searchParams.get("groupBy") || "day";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const { start, end } = getDateRange(range, from, to);

  const baseWhere = linkId
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

  const truncateFunc = groupBy === "hour" ? "hour" : "day";

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

  const result: { date: string; clicks: number; uniqueClicks: number }[] = [];
  const current = new Date(start);

  while (current <= end) {
    const match = clicksData.find((row) => {
      const rowDate = new Date(row.period).toISOString();
      if (groupBy === "hour") return rowDate.substring(0, 13) === current.toISOString().substring(0, 13);
      return rowDate.split("T")[0] === current.toISOString().split("T")[0];
    });

    result.push({
      date: groupBy === "hour"
        ? current.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" })
        : current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clicks: match?.clicks || 0,
      uniqueClicks: match?.uniqueClicks || 0,
    });

    if (groupBy === "hour") current.setHours(current.getHours() + 1);
    else current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({ data: result });
}

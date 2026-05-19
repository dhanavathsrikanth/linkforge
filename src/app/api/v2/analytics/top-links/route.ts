import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

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
  const range = searchParams.get("range") || "7d";
  const limit = parseInt(searchParams.get("limit") || "10");
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const { start, end } = getDateRange(range, from, to);

  const linkClicks = await db
    .select({
      linkId: clicks.linkId,
      clicks: sql<number>`count(*)::int`,
      uniqueClicks: sql<number>`count(distinct ${clicks.ip})::int`,
    })
    .from(clicks)
    .where(
      and(
        eq(clicks.workspaceId, auth.workspaceId),
        gte(clicks.createdAt, start),
        lte(clicks.createdAt, end)
      )
    )
    .groupBy(clicks.linkId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  const result = [];

  for (const clickData of linkClicks) {
    const link = await db.query.links.findFirst({
      where: eq(links.id, clickData.linkId),
    });
    if (!link) continue;

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

    const trend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const match = dailyClicks.find((row) =>
        new Date(row.date).toISOString().split("T")[0] === dateStr
      );
      trend.push(match ? match.clicks : 0);
    }

    const ctr = link.totalClicks > 0
      ? Math.round((clickData.clicks / link.totalClicks) * 10000) / 100
      : 0;

    result.push({
      id: link.id,
      title: link.title || link.slug,
      slug: link.slug,
      url: link.destination || "",
      clicks: clickData.clicks,
      uniqueClicks: clickData.uniqueClicks,
      ctr,
      trend,
    });
  }

  return NextResponse.json({ data: result });
}

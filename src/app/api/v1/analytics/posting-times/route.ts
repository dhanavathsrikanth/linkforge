import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

interface HourBucket {
  hour: number;
  label: string;
  clicks: number;
  percentage: number;
}

interface PostingTimesResponse {
  buckets: HourBucket[];
  peak: { hour: number; label: string; clicks: number };
  runnerUp: { hour: number; label: string; clicks: number };
  deadZone: { hour: number; label: string; clicks: number };
  recommendation: string;
}

function getDateRange(range: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to) };
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end: now };
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

const dayParts: { label: string; start: number; end: number }[] = [
  { label: "Early Morning", start: 0, end: 5 },
  { label: "Morning", start: 6, end: 11 },
  { label: "Afternoon", start: 12, end: 17 },
  { label: "Evening", start: 18, end: 23 },
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const linkId = searchParams.get("linkId") || undefined;
    const range = searchParams.get("range") || "30d";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!workspace || !dbUser) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    if (workspace.ownerId !== dbUser.id) {
      const [membership] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, dbUser.id)))
        .limit(1);
      if (!membership) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { start, end } = getDateRange(range, from, to);

    const baseWhere = linkId
      ? and(eq(clicks.workspaceId, workspaceId), eq(clicks.linkId, linkId), gte(clicks.createdAt, start), lte(clicks.createdAt, end))
      : and(eq(clicks.workspaceId, workspaceId), gte(clicks.createdAt, start), lte(clicks.createdAt, end));

    const totalResult = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(clicks)
      .where(baseWhere);
    const totalClicks = totalResult[0]?.total || 0;

    const hourData = await db
      .select({
        hour: sql<number>`extract(hour from ${clicks.createdAt})::int`,
        clicks: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(baseWhere)
      .groupBy(sql`extract(hour from ${clicks.createdAt})`)
      .orderBy(sql`extract(hour from ${clicks.createdAt})`);

    const buckets: HourBucket[] = [];
    for (let h = 0; h < 24; h++) {
      const found = hourData.find((d) => d.hour === h);
      const count = found?.clicks || 0;
      buckets.push({
        hour: h,
        label: hourLabel(h),
        clicks: count,
        percentage: totalClicks > 0 ? Math.round((count / totalClicks) * 1000) / 10 : 0,
      });
    }

    const sorted = [...buckets].sort((a, b) => b.clicks - a.clicks);
    const peak = sorted[0];
    const runnerUp = sorted[1] || sorted[0];
    const deadZone = [...buckets].sort((a, b) => a.clicks - b.clicks)[0];

    const recommendation = buildRecommendation(peak.hour, buckets);

    const response: PostingTimesResponse = {
      buckets,
      peak: { hour: peak.hour, label: peak.label, clicks: peak.clicks },
      runnerUp: { hour: runnerUp.hour, label: runnerUp.label, clicks: runnerUp.clicks },
      deadZone: { hour: deadZone.hour, label: deadZone.label, clicks: deadZone.clicks },
      recommendation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics posting-times error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildRecommendation(peakHour: number, buckets: HourBucket[]): string {
  const part = dayParts.find((p) => peakHour >= p.start && peakHour <= p.end);
  const partLabel = part?.label || "this time";

  const morningTotal = buckets.filter((b) => b.hour >= 6 && b.hour <= 11).reduce((s, b) => s + b.clicks, 0);
  const afternoonTotal = buckets.filter((b) => b.hour >= 12 && b.hour <= 17).reduce((s, b) => s + b.clicks, 0);
  const eveningTotal = buckets.filter((b) => b.hour >= 18 && b.hour <= 23).reduce((s, b) => s + b.clicks, 0);
  const earlyTotal = buckets.filter((b) => b.hour >= 0 && b.hour <= 5).reduce((s, b) => s + b.clicks, 0);

  const bestPart = [["Early Morning", earlyTotal], ["Morning", morningTotal], ["Afternoon", afternoonTotal], ["Evening", eveningTotal]]
    .sort((a, b) => (b[1] as number) - (a[1] as number))[0];

  const bestLabel = bestPart?.[0] || "Evening";
  const bestTotal = (bestPart?.[1] as number) || 0;
  const allTotal = morningTotal + afternoonTotal + eveningTotal + earlyTotal;
  const bestPct = allTotal > 0 ? Math.round((bestTotal / allTotal) * 100) : 0;

  return `Your audience is most active during ${partLabel}, with peak engagement at ${hourLabel(peakHour)}. ${bestLabel} accounts for ${bestPct}% of all clicks — schedule your most important links to go live during this window for maximum impact.`;
}

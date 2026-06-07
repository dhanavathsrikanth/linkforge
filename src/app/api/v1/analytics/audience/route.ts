import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, links, users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

interface AudienceProfileResponse {
  topDevice: { label: string; percentage: number };
  topBrowser: { label: string; percentage: number };
  topOs: { label: string; percentage: number };
  topCountry: { label: string; percentage: number };
  topReferrer: { label: string; percentage: number };
  mobileShare: number;
  desktopShare: number;
  platformSplit: { platform: string; percentage: number }[];
  summary: string;
}

function getDateRange(range: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to) };
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end: now };
}

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

    const safePercent = (n: number) => totalClicks > 0 ? Math.round((n / totalClicks) * 100) : 0;

    const getTop = async (column: any, nullLabel: string) => {
      const rows = await db
        .select({ label: column, clicks: sql<number>`count(*)::int` })
        .from(clicks)
        .where(baseWhere)
        .groupBy(sql`${column}`)
        .orderBy(desc(sql`count(*)`))
        .limit(1);
      let label = rows[0]?.label || nullLabel;
      if (label === null || label === "" || label === "XX") label = nullLabel;
      const count = rows[0]?.clicks || 0;
      return { label: String(label), percentage: safePercent(count) };
    };

    const [topDevice, topBrowser, topOs, topCountry, topReferrer] = await Promise.all([
      getTop(clicks.device, "Unknown"),
      getTop(clicks.browser, "Unknown"),
      getTop(clicks.os, "Unknown"),
      getTop(clicks.country, "Unknown"),
      getTop(clicks.referrerDomain, "Direct"),
    ]);

    const deviceRows = await db
      .select({ device: clicks.device, clicks: sql<number>`count(*)::int` })
      .from(clicks)
      .where(baseWhere)
      .groupBy(sql`${clicks.device}`)
      .orderBy(desc(sql`count(*)`));

    const mobileClick = deviceRows.filter((d) => d.device === "mobile" || d.device === "tablet").reduce((s, d) => s + d.clicks, 0);
    const desktopClick = deviceRows.filter((d) => d.device === "desktop").reduce((s, d) => s + d.clicks, 0);
    const otherClick = deviceRows.filter((d) => !["mobile", "tablet", "desktop"].includes(d.device)).reduce((s, d) => s + d.clicks, 0);
    const totalKnown = mobileClick + desktopClick + otherClick;

    const mobileShare = totalKnown > 0 ? Math.round((mobileClick / totalKnown) * 100) : 0;
    const desktopShare = totalKnown > 0 ? Math.round((desktopClick / totalKnown) * 100) : 0;

    const platformPairs: [string, number][] = [
      ["Mobile", mobileClick],
      ["Desktop", desktopClick],
      ["Other", otherClick],
    ];
    const platformSplit = platformPairs
      .filter(([_, c]) => c > 0)
      .map(([platform, clicksCount]) => ({
        platform,
        percentage: totalKnown > 0 ? Math.round((clicksCount / totalKnown) * 100) : 0,
      }));

    const summary = buildSummary(topDevice, topBrowser, topOs, topCountry, topReferrer, mobileShare, desktopShare);

    const response: AudienceProfileResponse = {
      topDevice,
      topBrowser,
      topOs,
      topCountry,
      topReferrer,
      mobileShare,
      desktopShare,
      platformSplit,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics audience error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildSummary(
  topDevice: { label: string; percentage: number },
  topBrowser: { label: string; percentage: number },
  topOs: { label: string; percentage: number },
  topCountry: { label: string; percentage: number },
  topReferrer: { label: string; percentage: number },
  mobileShare: number,
  desktopShare: number,
): string {
  const deviceLabel = topDevice.label.charAt(0).toUpperCase() + topDevice.label.slice(1);
  return `Your audience is primarily ${deviceLabel} (${mobileShare}% mobile, ${desktopShare}% desktop), using ${topBrowser.label} on ${topOs.label}. Most traffic comes from ${topCountry.label}, driven largely by ${topReferrer.label}.`;
}

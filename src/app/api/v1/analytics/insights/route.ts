import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, links, users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

interface Insight {
  type: "opportunity" | "trend" | "warning" | "recommendation";
  title: string;
  description: string;
  metric?: string;
  icon: string;
}

function getDateRange(range: string, from?: string, to?: string): { start: Date; end: Date; previousStart?: Date; previousEnd?: Date } {
  let end: Date, start: Date, previousEnd: Date, previousStart: Date;
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
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

    const { start, end, previousStart, previousEnd } = getDateRange(range, from, to);

    const insights: Insight[] = [];

    // 1. Growth trend
    const currentTotal = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(clicks)
      .where(buildWhere(workspaceId, undefined, start, end));

    const previousTotal = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(clicks)
      .where(buildWhere(workspaceId, undefined, previousStart, previousEnd));

    const current = currentTotal[0]?.total || 0;
    const previous = previousTotal[0]?.total || 0;

    if (previous > 0) {
      const growth = Math.round(((current - previous) / previous) * 100);
      if (growth > 20) {
        insights.push({
          type: "trend",
          title: "Traffic Surge",
          description: `Your click volume is up ${growth}% compared to the previous period. This is a significant growth spike.`,
          metric: `+${growth}%`,
          icon: "trending-up",
        });
      } else if (growth < -20) {
        insights.push({
          type: "warning",
          title: "Traffic Drop",
          description: `Your click volume dropped ${Math.abs(growth)}% compared to the previous period. Consider reviewing your recent posting strategy.`,
          metric: `${growth}%`,
          icon: "trending-down",
        });
      }
    }

    // 2. Top link insight
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
      .limit(3);

    if (topLinkData[0]?.linkId) {
      const first = topLinkData[0];
      const second = topLinkData[1];
      if (second && first.clicks > second.clicks * 2) {
        insights.push({
          type: "opportunity",
          title: "Star Performer",
          description: `/${first.slug} is driving ${first.clicks} clicks — more than double your second-best link. Analyze what makes it work and replicate.`,
          metric: `${first.clicks} clicks`,
          icon: "star",
        });
      } else if (first) {
        insights.push({
          type: "recommendation",
          title: "Top Link",
          description: `/${first.slug} is your best performer with ${first.clicks} clicks. Consider creating similar content or promoting it further.`,
          metric: `${first.clicks} clicks`,
          icon: "link",
        });
      }
    }

    // 3. Mobile vs desktop balance
    const deviceData = await db
      .select({ device: clicks.device, clicks: sql<number>`count(*)::int` })
      .from(clicks)
      .where(buildWhere(workspaceId, undefined, start, end))
      .groupBy(sql`${clicks.device}`)
      .orderBy(desc(sql`count(*)`));

    const mobileClicks = deviceData.filter((d) => d.device === "mobile" || d.device === "tablet").reduce((s, d) => s + d.clicks, 0);
    const desktopClicks = deviceData.filter((d) => d.device === "desktop").reduce((s, d) => s + d.clicks, 0);
    const totalDevices = mobileClicks + desktopClicks;

    if (totalDevices > 0) {
      const mobilePct = Math.round((mobileClicks / totalDevices) * 100);
      if (mobilePct > 80) {
        insights.push({
          type: "recommendation",
          title: "Mobile-First Audience",
          description: `${mobilePct}% of your traffic is on mobile. Ensure your landing pages load quickly and are fully responsive.`,
          metric: `${mobilePct}% mobile`,
          icon: "smartphone",
        });
      } else if (mobilePct < 20 && desktopClicks > 0) {
        insights.push({
          type: "recommendation",
          title: "Desktop-Heavy Audience",
          description: `${100 - mobilePct}% of clicks come from desktop. Optimize for large screens and consider keyboard-friendly CTAs.`,
          metric: `${100 - mobilePct}% desktop`,
          icon: "monitor",
        });
      }
    }

    // 4. Hour peak insight
    const hourData = await db
      .select({
        hour: sql<number>`extract(hour from ${clicks.createdAt})::int`,
        clicks: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(buildWhere(workspaceId, undefined, start, end))
      .groupBy(sql`extract(hour from ${clicks.createdAt})`)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    if (hourData[0]) {
      const peakHour = hourData[0].hour;
      const peakClicks = hourData[0].clicks;
      const peakLabel = peakHour === 0 ? "12 AM" : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? "12 PM" : `${peakHour - 12} PM`;
      const part = peakHour >= 6 && peakHour <= 11 ? "morning" : peakHour >= 12 && peakHour <= 17 ? "afternoon" : "evening";

      if (peakClicks > 0) {
        insights.push({
          type: "opportunity",
          title: "Best Posting Time",
          description: `Your audience peaks at ${peakLabel} (${peakClicks} clicks). Schedule your most important links to go live during ${part} for maximum engagement.`,
          metric: peakLabel,
          icon: "clock",
        });
      }
    }

    // 5. Country concentration
    const countryData = await db
      .select({ country: clicks.country, clicks: sql<number>`count(*)::int` })
      .from(clicks)
      .where(buildWhere(workspaceId, undefined, start, end))
      .groupBy(clicks.country)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    if (countryData[0]?.country && countryData[0].country !== "") {
      const topCountry = countryData[0].country;
      const topCountryClicks = countryData[0].clicks;
      if (topCountryClicks > 0 && current > 0) {
        const countryPct = Math.round((topCountryClicks / current) * 100);
        if (countryPct > 50) {
          insights.push({
            type: "recommendation",
            title: `Heavy ${topCountry} Concentration`,
            description: `${countryPct}% of your clicks come from ${topCountry}. Consider geo-targeted content or localized landing pages.`,
            metric: `${countryPct}%`,
            icon: "globe",
          });
        }
      }
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Analytics insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

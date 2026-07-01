import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, clicks, users, workspaces } from "@/lib/db/schema";
import { eq, and, gte, lt, desc, count, sql } from "drizzle-orm";
import { sendMonthlyReport } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // This month: 1st 00:00 UTC to today
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(monthStart);

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      workspaceId: workspaces.id,
    })
    .from(users)
    .innerJoin(workspaces, eq(workspaces.ownerId, users.id))
    .where(sql`${users.email} IS NOT NULL`);

  let sent = 0;
  let failed = 0;

  for (const user of allUsers) {
    try {
      // Total links in workspace
      const linkCount = await db
        .select({ count: count() })
        .from(links)
        .where(eq(links.workspaceId, user.workspaceId));

      // New links this month
      const newLinks = await db
        .select({ count: count() })
        .from(links)
        .where(
          and(
            eq(links.workspaceId, user.workspaceId),
            gte(links.createdAt, monthStart),
            lt(links.createdAt, now)
          )
        );

      // Top 5 links by clicks this month
      const topLinks = await db
        .select({
          slug: links.slug,
          title: links.title,
          clicks: count(clicks.id).as("clicks"),
        })
        .from(links)
        .leftJoin(
          clicks,
          and(
            eq(clicks.linkId, links.id),
            gte(clicks.createdAt, monthStart),
            lt(clicks.createdAt, now)
          )
        )
        .where(eq(links.workspaceId, user.workspaceId))
        .groupBy(links.id, links.slug, links.title)
        .orderBy(desc(count(clicks.id)))
        .limit(5);

      const totalClicks = topLinks.reduce((sum, l) => sum + Number(l.clicks), 0);
      if (totalClicks === 0) continue;

      // Last month clicks for comparison
      const prevMonthLinks = await db
        .select({ clicks: count(clicks.id).as("clicks"), slug: links.slug })
        .from(links)
        .leftJoin(
          clicks,
          and(
            eq(clicks.linkId, links.id),
            gte(clicks.createdAt, prevMonthStart),
            lt(clicks.createdAt, prevMonthEnd)
          )
        )
        .where(eq(links.workspaceId, user.workspaceId))
        .groupBy(links.id, links.slug);

      const prevClicksBySlug = Object.fromEntries(
        prevMonthLinks.map((l) => [l.slug, Number(l.clicks)])
      );
      const prevTotalClicks = prevMonthLinks.reduce((sum, l) => sum + Number(l.clicks), 0);

      // Top country and device
      const topCountryResult = await db
        .select({ value: clicks.country, count: count() })
        .from(clicks)
        .innerJoin(links, eq(clicks.linkId, links.id))
        .where(
          and(
            eq(links.workspaceId, user.workspaceId),
            gte(clicks.createdAt, monthStart),
            lt(clicks.createdAt, now),
            sql`${clicks.country} IS NOT NULL AND ${clicks.country} != 'XX' AND ${clicks.country} != 'Unknown'`
          )
        )
        .groupBy(clicks.country)
        .orderBy(desc(count()))
        .limit(1);

      const topDeviceResult = await db
        .select({ value: clicks.device, count: count() })
        .from(clicks)
        .innerJoin(links, eq(clicks.linkId, links.id))
        .where(
          and(
            eq(links.workspaceId, user.workspaceId),
            gte(clicks.createdAt, monthStart),
            lt(clicks.createdAt, now),
            sql`${clicks.device} IS NOT NULL AND ${clicks.device} != 'unknown' AND ${clicks.device} != 'bot'`
          )
        )
        .groupBy(clicks.device)
        .orderBy(desc(count()))
        .limit(1);

      await sendMonthlyReport(user.email!, {
        name: user.name || user.email!,
        monthLabel,
        totalClicks,
        prevTotalClicks,
        totalLinks: linkCount[0]?.count ?? 0,
        newLinks: newLinks[0]?.count ?? 0,
        topLinks: topLinks.map((l) => ({
          title: l.title || l.slug,
          slug: l.slug,
          clicks: Number(l.clicks),
          prevClicks: prevClicksBySlug[l.slug] ?? 0,
        })),
        topCountry: topCountryResult[0]?.value ?? "—",
        topDevice: topDeviceResult[0]?.value ?? "—",
      });

      sent++;
    } catch (err) {
      console.error(`[monthly-report] Failed for user ${user.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, timestamp: now.toISOString() });
}

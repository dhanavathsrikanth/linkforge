import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, clicks, users, workspaces } from "@/lib/db/schema";
import { eq, and, gte, lt, desc, count, sql } from "drizzle-orm";
import { sendWeeklyDigest } from "@/lib/email";

/**
 * GET /api/cron/weekly-digest
 * Triggered every Monday at 09:00 UTC by Vercel Cron.
 * Sends a weekly stats digest to every user who has at least one link.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // This week: Mon 00:00 to today
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1); // last Monday
  weekStart.setUTCHours(0, 0, 0, 0);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setUTCDate(weekStart.getUTCDate() - 7);

  const prevWeekEnd = new Date(weekStart); // = this week's monday = prev week's end

  const weekStartLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const todayLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  // Get all users who have workspaces with at least one link
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
      // Top 3 links by clicks this week
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
            gte(clicks.createdAt, weekStart),
            lt(clicks.createdAt, now)
          )
        )
        .where(eq(links.workspaceId, user.workspaceId))
        .groupBy(links.id, links.slug, links.title)
        .orderBy(desc(count(clicks.id)))
        .limit(3);

      // Skip users with no clicks this week
      const totalClicks = topLinks.reduce((sum, l) => sum + Number(l.clicks), 0);
      if (totalClicks === 0) continue;

      // Last week clicks for comparison
      const prevWeekLinks = await db
        .select({ clicks: count(clicks.id).as("clicks"), slug: links.slug })
        .from(links)
        .leftJoin(
          clicks,
          and(
            eq(clicks.linkId, links.id),
            gte(clicks.createdAt, prevWeekStart),
            lt(clicks.createdAt, prevWeekEnd)
          )
        )
        .where(eq(links.workspaceId, user.workspaceId))
        .groupBy(links.id, links.slug);

      const prevClicksBySlug = Object.fromEntries(
        prevWeekLinks.map((l) => [l.slug, Number(l.clicks)])
      );
      const prevTotalClicks = prevWeekLinks.reduce((sum, l) => sum + Number(l.clicks), 0);

      const topLinksForEmail = topLinks.map((l) => ({
        title: l.title || l.slug,
        slug: l.slug,
        clicks: Number(l.clicks),
        prevClicks: prevClicksBySlug[l.slug] ?? 0,
      }));

      // Pick a relevant recommendation based on data
      const recommendation =
        totalClicks > prevTotalClicks
          ? `Your top link "${topLinksForEmail[0]?.title}" is trending — consider boosting it with a QR code campaign.`
          : `Clicks are down this week. Try updating your link destinations or adding UTM parameters to measure campaign performance.`;

      await sendWeeklyDigest(user.email!, {
        name: user.name || user.email!,
        weekStart: weekStartLabel,
        weekEnd: todayLabel,
        totalClicks,
        prevTotalClicks,
        topLinks: topLinksForEmail,
        recommendation,
      });

      sent++;
    } catch (err) {
      console.error(`[weekly-digest] Failed for user ${user.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, timestamp: now.toISOString() });
}

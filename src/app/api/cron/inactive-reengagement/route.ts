import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, workspaces, links, clicks } from "@/lib/db/schema";
import { eq, and, gte, lt, desc, count, sql, lte } from "drizzle-orm";
import { sendInactiveUserEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Users who haven't signed in for 30+ days but have links with clicks
  const inactiveUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      workspaceId: workspaces.id,
      lastSignInAt: users.lastSignInAt,
    })
    .from(users)
    .innerJoin(workspaces, eq(workspaces.ownerId, users.id))
    .where(
      and(
        sql`${users.email} IS NOT NULL`,
        lte(users.lastSignInAt, thirtyDaysAgo),
      )
    );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of inactiveUsers) {
    try {
      // Total links
      const linkCount = await db
        .select({ count: count() })
        .from(links)
        .where(eq(links.workspaceId, user.workspaceId));

      const totalLinks = Number(linkCount[0]?.count ?? 0);
      if (totalLinks === 0) { skipped++; continue; }

      // Clicks in the last 60 days
      const recentClicks = await db
        .select({ clicks: count(clicks.id).as("clicks") })
        .from(links)
        .leftJoin(
          clicks,
          and(
            eq(clicks.linkId, links.id),
            gte(clicks.createdAt, sixtyDaysAgo),
            lt(clicks.createdAt, now)
          )
        )
        .where(eq(links.workspaceId, user.workspaceId))
        .groupBy(links.id);

      const totalClicks = recentClicks.reduce((sum, l) => sum + Number(l.clicks), 0);
      if (totalClicks === 0) { skipped++; continue; }

      // Top link
      const topLink = await db
        .select({
          title: links.title,
          slug: links.slug,
          clicks: count(clicks.id).as("clicks"),
        })
        .from(links)
        .leftJoin(
          clicks,
          and(
            eq(clicks.linkId, links.id),
            gte(clicks.createdAt, sixtyDaysAgo),
            lt(clicks.createdAt, now)
          )
        )
        .where(eq(links.workspaceId, user.workspaceId))
        .groupBy(links.id, links.title, links.slug)
        .orderBy(desc(count(clicks.id)))
        .limit(1);

      const topClicks = Number(topLink[0]?.clicks ?? 0);

      // Clicks change since last re-engagement (simple: just use total clicks)
      const lastCheckKey = `reengagement_sent:${user.id}`;
      // For simplicity, totalClicksChange = totalClicks (first time) or we just show current

      const lastSeenDays = Math.floor(
        (now.getTime() - new Date(user.lastSignInAt ?? now).getTime()) / (1000 * 60 * 60 * 24)
      );

      await sendInactiveUserEmail(user.email!, {
        name: user.name || user.email!,
        lastSeenDays,
        totalLinks,
        totalClicks,
        totalClicksChange: totalClicks,
        topLinkTitle: topLink[0]?.title || topLink[0]?.slug || "",
        topLinkClicks: topClicks,
        dashboardUrl: "https://pivoturl.com/dashboard",
      });

      sent++;
    } catch (err) {
      console.error(`[inactive-reengagement] Failed for user ${user.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    total: inactiveUsers.length,
    sent,
    skipped,
    failed,
    timestamp: now.toISOString(),
  });
}

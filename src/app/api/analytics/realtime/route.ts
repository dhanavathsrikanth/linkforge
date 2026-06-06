import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { workspaces, links, workspaceMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    // Verify the caller is allowed to see this slug's analytics: they must
    // own the workspace that owns the link, or be a member of it.
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [linkRow] = await db
      .select({ workspaceId: links.workspaceId })
      .from(links)
      .where(eq(links.slug, slug))
      .limit(1);

    if (!linkRow) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const [ownedWs] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.id, linkRow.workspaceId), eq(workspaces.ownerId, user.id)))
      .limit(1);

    if (!ownedWs) {
      const [member] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, linkRow.workspaceId), eq(workspaceMembers.userId, user.id)))
        .limit(1);
      if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch latest clicks from Redis
    // We use LRANGE to get the most recent clicks
    const rawClicks = await redis.lrange(`clicks:${slug}`, 0, 49); // Last 50 clicks
    const clicks = rawClicks.map((c: string) => { try { return JSON.parse(c); } catch { return null; } }).filter(Boolean);

    // Per-link stats (not global)
    const today = new Date().toISOString().split('T')[0];
    const linkToday = await redis.get(`stats:clicks:${slug}:daily:${today}`);
    const linkTotal = await redis.get(`stats:clicks:${slug}:total`);

    return NextResponse.json({
      success: true,
      data: {
        recentClicks: clicks,
        stats: {
          today: parseInt(linkToday as string || "0"),
          total: parseInt(linkTotal as string || "0"),
        }
      }
    });
  } catch (err) {
    console.error("Realtime analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

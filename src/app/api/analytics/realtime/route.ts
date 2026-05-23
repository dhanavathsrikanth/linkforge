import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    // Verify user owns the workspace for this link
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

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
    const clicks = await redis.lrange(`clicks:${slug}`, 0, 49); // Last 50 clicks

    // Also get quick stats
    const totalToday = await redis.get(`stats:clicks:daily:${new Date().toISOString().split('T')[0]}`);
    const globalTotal = await redis.get(`stats:clicks:total`);

    return NextResponse.json({
      success: true,
      data: {
        recentClicks: clicks,
        stats: {
          today: parseInt(totalToday as string || "0"),
          total: parseInt(globalTotal as string || "0"),
        }
      }
    });
  } catch (err) {
    console.error("Realtime analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

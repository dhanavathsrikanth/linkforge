import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    // Basic secret check for cron/internal calls
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.INTERNAL_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all keys matching clicks:*
    const keys = await redis.keys("clicks:*");
    let processedCount = 0;

    for (const key of keys) {
      const slug = key.split(":")[1];
      
      // Atomically pop all elements from the list
      // In a real production app, we might want to pop in batches
      const items = await redis.lrange(key, 0, -1);
      if (items.length === 0) continue;

      // Prepare for DB insert
      const clickRecords = items.map((item: any) => ({
        linkId: item.linkId,
        workspaceId: item.workspaceId,
        ip: item.ip,
        country: item.country,
        device: item.device,
        browser: item.browser,
        os: item.os,
        referrer: item.referrer,
        referrerDomain: item.referrerDomain,
        abVariant: item.abVariant,
        createdAt: new Date(item.ts),
      }));

      // Insert into Neon
      await db.insert(clicks).values(clickRecords);

      // Update link counters
      await db
        .update(links)
        .set({
          totalClicks: sql`${links.totalClicks} + ${items.length}`,
          updatedAt: new Date(),
        })
        .where(eq(links.slug, slug));

      // Clear the list in Redis
      await redis.del(key);
      processedCount += items.length;
    }

    return NextResponse.json({ success: true, flushed: processedCount });
  } catch (err) {
    console.error("Flush error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

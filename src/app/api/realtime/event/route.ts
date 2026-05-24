import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { Redis as RedisClient } from "@upstash/redis";

const redis = new RedisClient({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, workspaceId, linkId, folderId } = body;

    if (!type || !workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = [
      "link_created",
      "link_updated", 
      "link_deleted",
      "folder_created",
      "folder_updated",
      "folder_deleted",
      "member_joined",
      "member_left",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const event = {
      type,
      workspaceId,
      userId,
      data: {
        linkId,
        folderId,
        triggeredAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    try {
      await redis.publish(`workspace:${workspaceId}:events`, JSON.stringify(event));
    } catch (redisError) {
      console.error("[realtime-event] Redis publish failed:", redisError);
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("[realtime-event] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

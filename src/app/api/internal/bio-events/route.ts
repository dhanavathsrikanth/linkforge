import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface BioPageEvent {
  ts: string;
  country: string;
  city: string;
  region: string;
  device: string;
  browser?: string;
  os?: string;
  referrer?: string;
  ipHash: string;
  isUnique: boolean;
}

interface GalleryEventBatch {
  galleryId: string;
  slug?: string;
  data: BioPageEvent[];
  viewsByDate: Record<string, number>;
}

/**
 * POST /api/internal/bio-events
 *
 * Receives buffered analytics events and writes view counts to Redis.
 * Auth: Bearer token matching INTERNAL_SECRET env var.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("Authorization");
  const secret = auth?.replace("Bearer ", "");
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { events: GalleryEventBatch[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { events } = body;
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let totalUpdated = 0;

  for (const batch of events) {
    try {
      const galleryId = batch.galleryId.startsWith("slug:")
        ? batch.galleryId
        : batch.galleryId;

      // Write daily view totals to Redis
      for (const [date, count] of Object.entries(batch.viewsByDate)) {
        const redisKey = `bio:views:${galleryId}:${date}`;
        await redis.incrby(redisKey, count);
        await redis.expire(redisKey, 90 * 24 * 60 * 60);
        totalUpdated++;
      }
    } catch (err) {
      console.error("[POST /api/internal/bio-events] batch error", err);
    }
  }

  return NextResponse.json({ processed: events.length, updated: totalUpdated });
}

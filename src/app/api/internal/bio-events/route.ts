import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGallery, linkGalleryBlockEvents } from "@/lib/db";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

/**
 * POST /api/internal/bio-events
 *
 * Called by the GitHub Actions hourly cron (bio-analytics-flush.yml).
 * Receives buffered analytics events from Cloudflare KV and writes them
 * to Neon Postgres (link_gallery_block_events).
 *
 * Auth: Bearer token matching INTERNAL_SECRET env var.
 *
 * Body:
 * {
 *   events: Array<{
 *     galleryId: string;   // may be "slug:{slug}" if galleryId wasn't known at edge
 *     slug?: string;
 *     data: BioPageEvent[];
 *     viewsByDate: Record<string, number>;  // { "2025-05-29": 42 }
 *   }>
 * }
 */

interface BioPageEvent {
  ts: string;
  country: string;
  city: string;
  region: string;
  lat?: string;
  lon?: string;
  device: string;
  browser?: string;
  os?: string;
  referrer?: string;
  ipHash: string;
  isUnique: boolean;
}

interface GalleryEventBatch {
  /** Either a real UUID or "slug:{slug}" when galleryId wasn't known at edge */
  galleryId: string;
  slug?: string;
  data: BioPageEvent[];
  viewsByDate: Record<string, number>;
}

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
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

  let totalInserted = 0;
  const errors: string[] = [];

  for (const batch of events) {
    try {
      // Resolve galleryId from slug if needed
      let galleryId = batch.galleryId;

      if (galleryId.startsWith("slug:")) {
        const slug = galleryId.slice(5);
        const gallery = await db.query.linkGallery.findFirst({
          where: (g, { eq }) => eq(g.slug, slug),
          columns: { id: true },
        });
        if (!gallery) {
          errors.push(`Gallery not found for slug: ${slug}`);
          continue;
        }
        galleryId = gallery.id;
      }

      // Insert individual view events into link_gallery_block_events
      // We use a synthetic "page-view" block event (blockId = galleryId, blockType = "page")
      if (batch.data.length > 0) {
        const rows = batch.data.map((event) => ({
          galleryId,
          blockId: galleryId, // page-level event — use galleryId as blockId
          blockType: "page",
          eventType: "view" as const,
          metadata: {
            browser: event.browser,
            os: event.os,
            lat: event.lat,
            lon: event.lon,
            isUnique: event.isUnique,
          },
          ip: event.ipHash,
          country: event.country || null,
          device: event.device || null,
          referrer: event.referrer || null,
          createdAt: new Date(event.ts),
        }));

        // Batch insert in chunks of 100 to avoid Neon statement size limits
        const CHUNK = 100;
        for (let i = 0; i < rows.length; i += CHUNK) {
          await db.insert(linkGalleryBlockEvents).values(rows.slice(i, i + CHUNK));
        }
        totalInserted += rows.length;
      }

      // Also write daily view totals to Redis for fast dashboard reads
      // Key: bio:views:{galleryId}:{date} → integer
      for (const [date, count] of Object.entries(batch.viewsByDate)) {
        const redisKey = `bio:views:${galleryId}:${date}`;
        await redis.incrby(redisKey, count);
        // Expire after 90 days
        await redis.expire(redisKey, 90 * 24 * 60 * 60);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch ${batch.galleryId}: ${msg}`);
      console.error("[POST /api/internal/bio-events] batch error", err);
    }
  }

  return NextResponse.json({
    processed: events.length,
    inserted: totalInserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}

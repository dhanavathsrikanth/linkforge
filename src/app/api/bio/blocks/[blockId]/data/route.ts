import { NextResponse } from "next/server";
import { db, linkGalleryBlocks } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  fetchSpotifyNowPlaying,
  fetchInstagramFollowers,
  fetchInstagramLatestPosts,
  fetchTikTokFollowers,
  fetchTikTokLatestVideo,
  fetchThreadsFollowers,
} from "@/lib/gallery/sync";
import { validateBlockData } from "@/lib/bio/blocks";

/**
 * GET /api/bio/blocks/[blockId]/data
 *
 * Returns live data for an integration block.
 * Public — no auth required (data is shown on the public bio page).
 * Cache: 60s (stale-while-revalidate: 30s).
 *
 * PATCH /api/bio/blocks/[blockId]/data — update block data (existing, auth-gated)
 */

export { PATCH } from "./patch";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const { blockId } = await params;

  // Look up block to get type + galleryId
  const block = await db.query.linkGalleryBlocks.findFirst({
    where: eq(linkGalleryBlocks.id, blockId),
    columns: { id: true, type: true, galleryId: true, config: true },
  });

  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const { type, galleryId } = block;

  let data: unknown = null;

  try {
    switch (type) {
      case "spotify-playing-now":
        data = await fetchSpotifyNowPlaying(galleryId);
        break;

      case "instagram-follower-count":
        data = await fetchInstagramFollowers(galleryId);
        break;

      case "instagram-latest-post": {
        const config = block.config as Record<string, unknown>;
        const numberOfPosts = typeof config.numberOfPosts === "number" ? config.numberOfPosts : 1;
        data = await fetchInstagramLatestPosts(galleryId, numberOfPosts);
        break;
      }

      case "tiktok-follower-count":
        data = await fetchTikTokFollowers(galleryId);
        break;

      case "tiktok-latest-post":
        data = await fetchTikTokLatestVideo(galleryId);
        break;

      case "threads-follower-count":
        data = await fetchThreadsFollowers(galleryId);
        break;

      default:
        return NextResponse.json(
          { error: `No live data available for block type: ${type}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error(`[GET /api/bio/blocks/${blockId}/data] fetch error:`, err);
    return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 });
  }

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    }
  );
}

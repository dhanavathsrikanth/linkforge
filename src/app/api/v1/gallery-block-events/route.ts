import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGalleryBlocks, linkGalleryBlockEvents } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: false,
  prefix: "bio_block_evt",
});

const BlockEventSchema = z.object({
  blockId: z.string().uuid(),
  eventType: z.enum(["click", "reaction", "submission", "view"]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// POST /api/v1/gallery-block-events — record a block interaction event
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = BlockEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", detail: parsed.error.flatten() }, { status: 422 });
    }

    const { blockId, eventType, metadata } = parsed.data;

    // Look up block to get galleryId + blockType
    const block = await db.query.linkGalleryBlocks.findFirst({
      where: eq(linkGalleryBlocks.id, blockId),
    });
    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    // Rate limit per IP per gallery
    // CF-Connecting-IP is set by the Cloudflare Worker; fall back to x-forwarded-for
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anon";
    const rl = await ratelimit.limit(`${ip}:${block.galleryId}`);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // CF provides richer geo data via headers injected by the Worker
    const country =
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-vercel-ip-country") ??
      null;
    const referrer = req.headers.get("referer") ?? null;

    const ua = req.headers.get("user-agent") ?? "";
    // Use device type header injected by Worker if available
    const workerDevice = req.headers.get("x-device-type");
    const isMobile = workerDevice
      ? workerDevice === "mobile"
      : /mobile|android|iphone|ipad/i.test(ua);
    const device = isMobile ? "mobile" : "desktop";

    await db.insert(linkGalleryBlockEvents).values({
      galleryId: block.galleryId,
      blockId,
      blockType: block.type,
      eventType,
      metadata,
      ip,
      country,
      device,
      referrer,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/gallery-block-events]", err);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}

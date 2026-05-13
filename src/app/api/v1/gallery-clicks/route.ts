import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGalleryClicks } from "@/lib/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

// P3: Rate limiter — 10 clicks per IP per gallery per minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: false,
  prefix: "bio_click",
});

const ClickSchema = z.object({
  galleryId: z.string().uuid(),
  linkIndex: z.number().int().min(0),
});

// POST /api/v1/gallery-clicks
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ClickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
    }

    const { galleryId, linkIndex } = parsed.data;

    // P3: Rate limit — key = ip:galleryId so each gallery gets its own 10/min budget per IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = await ratelimit.limit(`${ip}:${galleryId}`);
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const country = req.headers.get("x-vercel-ip-country") ?? null;
    const referrer = req.headers.get("referer") ?? null;

    const ua = req.headers.get("user-agent") ?? "";
    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    const device = isMobile ? "mobile" : "desktop";

    // P1: Insert click row only — no denormalised counter.
    // Total clicks are computed via COUNT(*) on read to avoid drift.
    await db.insert(linkGalleryClicks).values({
      galleryId,
      linkIndex,
      ip,
      country,
      device: device as "mobile" | "desktop" | "tablet" | "bot" | "unknown",
      referrer,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/gallery-clicks]", err);
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}

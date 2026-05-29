import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGalleryReactions, linkGalleryBlocks } from "@/lib/db";
import { eq, and, count, sql } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// 16 reactions per IP per block per hour — matches the UI cap
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(16, "1 h"),
  analytics: false,
  prefix: "bio_reaction",
});

// ─── IP helpers ───────────────────────────────────────────────────────────────

function getIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

// ─── GET /api/bio/reactions?blockId= ─────────────────────────────────────────
// Returns total reaction count + this IP's current count for the block.
// Public — no auth required (reactions are public).

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get("blockId");

  if (!blockId) {
    return NextResponse.json({ error: "blockId required" }, { status: 400 });
  }

  // Verify block exists
  const block = await db.query.linkGalleryBlocks.findFirst({
    where: eq(linkGalleryBlocks.id, blockId),
    columns: { id: true, galleryId: true },
  });

  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const ip = getIp(req);
  const ipHash = await hashIp(ip);

  // Total reactions for this block (grouped by emoji)
  const totalRows = await db
    .select({
      emoji: linkGalleryReactions.emoji,
      total: count(),
    })
    .from(linkGalleryReactions)
    .where(eq(linkGalleryReactions.blockId, blockId))
    .groupBy(linkGalleryReactions.emoji);

  // This IP's reactions for this block
  const currentRows = await db
    .select({
      emoji: linkGalleryReactions.emoji,
      current: count(),
    })
    .from(linkGalleryReactions)
    .where(
      and(
        eq(linkGalleryReactions.blockId, blockId),
        eq(linkGalleryReactions.ip, ipHash)
      )
    )
    .groupBy(linkGalleryReactions.emoji);

  const total: Record<string, number> = {};
  for (const row of totalRows) {
    total[row.emoji] = Number(row.total);
  }

  const current: Record<string, number> = {};
  for (const row of currentRows) {
    current[row.emoji] = Number(row.current);
  }

  return NextResponse.json(
    { total, current },
    {
      headers: {
        // Short cache — reactions update frequently
        "Cache-Control": "no-store",
      },
    }
  );
}

// ─── POST /api/bio/reactions ──────────────────────────────────────────────────
// Adds N reactions for a block. Batched — the client sends the accumulated
// count after a debounce period.
// Rate limited: 16 reactions per IP per block per hour.

const PostSchema = z.object({
  blockId: z.string().uuid(),
  /** Number of reactions to add (1-16) */
  increment: z.number().int().min(1).max(16),
  /** Emoji type — defaults to "love" */
  emoji: z.string().max(10).optional().default("love"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 422 }
    );
  }

  const { blockId, increment, emoji } = parsed.data;

  // Verify block exists
  const block = await db.query.linkGalleryBlocks.findFirst({
    where: eq(linkGalleryBlocks.id, blockId),
    columns: { id: true, galleryId: true },
  });

  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const ip = getIp(req);
  const ipHash = await hashIp(ip);

  // Rate limit: 16 reactions per IP per block per hour
  const rl = await ratelimit.limit(`${ipHash}:${blockId}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many reactions", remaining: rl.remaining },
      {
        status: 429,
        headers: { "Retry-After": "3600" },
      }
    );
  }

  // Check how many this IP has already reacted (cap at 16 total)
  const [existingRow] = await db
    .select({ current: count() })
    .from(linkGalleryReactions)
    .where(
      and(
        eq(linkGalleryReactions.blockId, blockId),
        eq(linkGalleryReactions.ip, ipHash),
        eq(linkGalleryReactions.emoji, emoji)
      )
    );

  const existing = Number(existingRow?.current ?? 0);
  const MAX_PER_IP = 16;
  const allowed = Math.min(increment, MAX_PER_IP - existing);

  if (allowed <= 0) {
    // Already at max — return current totals without inserting
    const [totalRow] = await db
      .select({ total: count() })
      .from(linkGalleryReactions)
      .where(
        and(
          eq(linkGalleryReactions.blockId, blockId),
          eq(linkGalleryReactions.emoji, emoji)
        )
      );

    return NextResponse.json({
      total: { [emoji]: Number(totalRow?.total ?? 0) },
      current: { [emoji]: existing },
    });
  }

  // Insert `allowed` reaction rows
  const rows = Array.from({ length: allowed }, () => ({
    galleryId: block.galleryId,
    blockId,
    emoji,
    ip: ipHash,
  }));

  await db.insert(linkGalleryReactions).values(rows);

  // Return updated totals
  const [totalRow] = await db
    .select({ total: count() })
    .from(linkGalleryReactions)
    .where(
      and(
        eq(linkGalleryReactions.blockId, blockId),
        eq(linkGalleryReactions.emoji, emoji)
      )
    );

  const newTotal = Number(totalRow?.total ?? 0);
  const newCurrent = existing + allowed;

  return NextResponse.json({
    total: { [emoji]: newTotal },
    current: { [emoji]: newCurrent },
  });
}

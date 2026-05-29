import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  linkGallery,
  linkGalleryBlocks,
  linkGalleryBlockEvents,
} from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { and, eq, desc } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/bio/blocks/[blockId]/submissions
 *
 * Owner-only. Returns the list of `submission` events for a block —
 * used by the WaitlistBlock editor to show signups directly inside
 * the editor instead of forcing the user to dig through analytics.
 *
 * The block's gallery must belong to the calling user.
 *
 * Response shape:
 *   {
 *     total: number,
 *     submissions: Array<{
 *       email: string;
 *       createdAt: string; // ISO
 *       country: string | null;
 *       device: string | null;
 *     }>
 *   }
 *
 * Query params:
 *   format=csv  — returns text/csv instead of JSON (for export)
 *   limit       — cap the number of rows (default 500, max 5000)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { blockId } = await params;
  if (!UUID_RE.test(blockId)) {
    return NextResponse.json({ error: "Invalid blockId" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "500", 10) || 500, 1),
    5000
  );

  try {
    // Verify the block exists AND its gallery belongs to the caller.
    const block = await db
      .select({
        id: linkGalleryBlocks.id,
        galleryId: linkGalleryBlocks.galleryId,
        type: linkGalleryBlocks.type,
        ownerId: linkGallery.userId,
      })
      .from(linkGalleryBlocks)
      .innerJoin(linkGallery, eq(linkGalleryBlocks.galleryId, linkGallery.id))
      .where(eq(linkGalleryBlocks.id, blockId))
      .limit(1);

    if (block.length === 0) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }
    if (block[0].ownerId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await db
      .select({
        metadata: linkGalleryBlockEvents.metadata,
        createdAt: linkGalleryBlockEvents.createdAt,
        country: linkGalleryBlockEvents.country,
        device: linkGalleryBlockEvents.device,
      })
      .from(linkGalleryBlockEvents)
      .where(
        and(
          eq(linkGalleryBlockEvents.blockId, blockId),
          eq(linkGalleryBlockEvents.eventType, "submission")
        )
      )
      .orderBy(desc(linkGalleryBlockEvents.createdAt))
      .limit(limit);

    // Dedupe by email (keep the most recent timestamp). Submissions are
    // recorded raw — same person hitting submit twice creates two rows.
    const seen = new Map<
      string,
      { email: string; createdAt: string; country: string | null; device: string | null }
    >();
    for (const r of rows) {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const email = typeof meta.email === "string" ? meta.email.toLowerCase().trim() : "";
      if (!email) continue;
      if (seen.has(email)) continue;
      seen.set(email, {
        email,
        createdAt: r.createdAt.toISOString(),
        country: r.country ?? null,
        device: r.device ?? null,
      });
    }

    const submissions = Array.from(seen.values());

    if (format === "csv") {
      const header = "email,created_at,country,device";
      const lines = submissions.map((s) =>
        [
          escapeCsv(s.email),
          escapeCsv(s.createdAt),
          escapeCsv(s.country ?? ""),
          escapeCsv(s.device ?? ""),
        ].join(",")
      );
      const body = [header, ...lines].join("\n");
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="waitlist-${blockId.slice(0, 8)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      total: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error("[GET /api/bio/blocks/[blockId]/submissions]", err);
    return NextResponse.json(
      { error: "Failed to load submissions" },
      { status: 500 }
    );
  }
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

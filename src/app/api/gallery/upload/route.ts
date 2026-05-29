import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGalleryAssets, linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve the Clerk userId to our DB user UUID. Querying linkGallery by
  // userId directly (a Clerk string like "user_2…") against a uuid column
  // throws an SQL syntax error and surfaces as a 500.
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  let body: {
    galleryId: string;
    file: string;
    filename: string;
    mimeType: string;
    blockId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { galleryId, file, filename, mimeType, blockId } = body;
  if (!galleryId || !file || !filename || !mimeType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!UUID_RE.test(galleryId)) {
    return NextResponse.json({ error: "Invalid galleryId" }, { status: 400 });
  }

  try {
    const gallery = await db.query.linkGallery.findFirst({
      where: and(eq(linkGallery.id, galleryId), eq(linkGallery.userId, dbUser.id)),
    });
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Strip data URI prefix so we can compute size from raw base64.
    const rawBase64 = file.includes(",") ? file.split(",")[1] : file;

    // Approximate decoded byte size from base64 length.
    const size = Math.round((rawBase64.length * 3) / 4);
    if (size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 413 });
    }

    // blockId is a uuid column — only forward valid UUIDs (newly-added
    // blocks before their first save have no DB row yet, so we drop the
    // association rather than fail the upload).
    const safeBlockId = blockId && UUID_RE.test(blockId) ? blockId : null;

    const [asset] = await db
      .insert(linkGalleryAssets)
      .values({
        galleryId,
        blockId: safeBlockId,
        filename,
        mimeType,
        size,
        data: rawBase64,
      })
      .returning();

    return NextResponse.json({ asset });
  } catch (err) {
    console.error("[POST /api/gallery/upload]", err);
    const detail = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "Failed to upload asset", detail: detail.slice(0, 500) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const galleryId = searchParams.get("galleryId");
  const blockId = searchParams.get("blockId");

  if (!galleryId) return NextResponse.json({ error: "galleryId required" }, { status: 400 });
  if (!UUID_RE.test(galleryId)) {
    return NextResponse.json({ error: "Invalid galleryId" }, { status: 400 });
  }

  try {
    const gallery = await db.query.linkGallery.findFirst({
      where: and(eq(linkGallery.id, galleryId), eq(linkGallery.userId, dbUser.id)),
    });
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    const conditions = [eq(linkGalleryAssets.galleryId, galleryId)];
    if (blockId && UUID_RE.test(blockId)) {
      conditions.push(eq(linkGalleryAssets.blockId, blockId));
    }

    const assets = await db.query.linkGalleryAssets.findMany({
      where: and(...conditions),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    return NextResponse.json({ assets });
  } catch (err) {
    console.error("[GET /api/gallery/upload]", err);
    const detail = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "Failed to load assets", detail: detail.slice(0, 500) },
      { status: 500 }
    );
  }
}

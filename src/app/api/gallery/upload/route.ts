import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGalleryAssets, linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { uploadToR2, r2Key } from "@/lib/r2";
import { and, eq } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isR2Configured(): boolean {
  return !!(
    (process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CF_ACCOUNT_ID) &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  );
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const rawBase64 = file.includes(",") ? file.split(",")[1] : file;
    const size = Math.round((rawBase64.length * 3) / 4);
    const maxSize = parseInt(process.env.CLOUDFLARE_R2_MAX_UPLOAD_BYTES || "10485760", 10); // 10MB default
    if (size > maxSize) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB.` }, { status: 413 });
    }

    const safeBlockId = blockId && UUID_RE.test(blockId) ? blockId : null;

    const [asset] = await db
      .insert(linkGalleryAssets)
      .values({ galleryId, blockId: safeBlockId, filename, mimeType, size, data: "" })
      .returning();

    if (isR2Configured()) {
      const binary = Buffer.from(rawBase64, "base64");
      const key = await uploadToR2(asset.id, filename, binary, mimeType);
      await db.update(linkGalleryAssets).set({ data: `r2:${key}` }).where(eq(linkGalleryAssets.id, asset.id));
    } else {
      await db.update(linkGalleryAssets).set({ data: rawBase64 }).where(eq(linkGalleryAssets.id, asset.id));
    }

    const stored = await db.query.linkGalleryAssets.findFirst({
      where: eq(linkGalleryAssets.id, asset.id),
      columns: { id: true, galleryId: true, blockId: true, filename: true, mimeType: true, size: true, width: true, height: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ asset: stored });
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
      columns: { id: true, galleryId: true, blockId: true, filename: true, mimeType: true, size: true, width: true, height: true, createdAt: true, updatedAt: true },
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

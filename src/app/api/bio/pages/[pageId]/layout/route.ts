import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, linkGallery, linkGalleryBlocks } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET /api/bio/pages/:pageId/layout — get page layout
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params;

  const page = await db.query.linkGallery.findFirst({
    where: eq(linkGallery.id, pageId),
  });
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const validBlockIds = await db
    .select({ id: linkGalleryBlocks.id })
    .from(linkGalleryBlocks)
    .where(eq(linkGalleryBlocks.galleryId, pageId));

  const validIds = new Set(validBlockIds.map((b) => b.id));

  const filterLayout = (layout: unknown) => {
    if (!Array.isArray(layout)) return [];
    return (layout as { i: string }[]).filter((entry) => entry?.i && validIds.has(entry.i));
  };

  return NextResponse.json({
    sm: filterLayout(page.layout),
    xxs: filterLayout(page.mobileLayout),
  });
}

// PATCH /api/bio/pages/:pageId/layout — update page layout
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { pageId } = await params;

  const page = await db.query.linkGallery.findFirst({
    where: eq(linkGallery.id, pageId),
  });
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const body = await req.json();
  const sm = body.sm ?? page.layout;
  const xxs = body.xxs ?? body.mobileLayout ?? page.mobileLayout;

  await db
    .update(linkGallery)
    .set({ layout: sm, mobileLayout: xxs, updatedAt: new Date() })
    .where(eq(linkGallery.id, pageId));

  return NextResponse.json({ id: pageId, sm, xxs });
}

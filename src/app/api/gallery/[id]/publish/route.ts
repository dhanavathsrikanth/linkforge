import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

// POST /api/gallery/[id]/publish — toggle publish state
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const gallery = await db.query.linkGallery.findFirst({
      where: (g, { and, eq }) => and(eq(g.id, id), eq(g.userId, dbUser.id)),
    });
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    const [updated] = await db
      .update(linkGallery)
      .set({ isPublished: !gallery.isPublished, updatedAt: new Date() })
      .where(eq(linkGallery.id, id))
      .returning();

    return NextResponse.json({ gallery: updated });
  } catch (err) {
    console.error("[POST /api/gallery/[id]/publish]", err);
    return NextResponse.json({ error: "Failed to toggle publish" }, { status: 500 });
  }
}

// DELETE /api/gallery/[id] — permanently delete bio page (M1)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    // Verify ownership before deleting
    const gallery = await db.query.linkGallery.findFirst({
      where: (g, { and, eq }) => and(eq(g.id, id), eq(g.userId, dbUser.id)),
    });
    if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    await db.delete(linkGallery).where(
      and(eq(linkGallery.id, id), eq(linkGallery.userId, dbUser.id))
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/gallery/[id]]", err);
    return NextResponse.json({ error: "Failed to delete gallery" }, { status: 500 });
  }
}

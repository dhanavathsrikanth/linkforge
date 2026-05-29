import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/gallery/[id]
 *
 * Permanently removes a bio page and everything it owns. Foreign-key
 * cascades on `link_gallery_blocks`, `link_gallery_assets`,
 * `link_gallery_integrations`, `link_gallery_block_events`, and
 * `link_gallery_clicks` clean up child rows automatically.
 *
 * Auth: Clerk session → DB user → ownership check on the gallery row.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid gallery id" }, { status: 400 });
  }

  try {
    // Verify ownership before destructive action.
    const gallery = await db.query.linkGallery.findFirst({
      where: (g, { eq, and }) => and(eq(g.id, id), eq(g.userId, dbUser.id)),
      columns: { id: true },
    });
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    await db
      .delete(linkGallery)
      .where(and(eq(linkGallery.id, id), eq(linkGallery.userId, dbUser.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/gallery/[id]]", err);
    const detail = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "Failed to delete gallery", detail: detail.slice(0, 500) },
      { status: 500 }
    );
  }
}

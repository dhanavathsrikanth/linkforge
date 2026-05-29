import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { buildPublishedSnapshot } from "@/lib/bio/publish-snapshot";

// ─── CF KV cache invalidation helper ─────────────────────────────────────────
// Mirrors the helper in /api/gallery/route.ts. Kept local to avoid pulling
// the whole gallery route module into this lightweight handler.
async function purgeBioCache(slug: string): Promise<void> {
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return;

  try {
    await fetch(`${workerUrl}/internal/bio/purge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": workerSecret,
      },
      body: JSON.stringify({ slug }),
    });
  } catch (err) {
    console.warn("[purgeBioCache] Failed (non-blocking):", err);
  }
}

// POST /api/gallery/[id]/publish — toggle publish state.
//
// Behavior:
//   - draft → published: snapshots current draft into `published_snapshot`
//     and stamps `published_at`. The public /p/[slug] route is now live.
//   - published → draft (unpublish): flips `is_published` only. We keep
//     the snapshot so the user can re-publish without losing it; /p/[slug]
//     starts returning 404 because the SELECT requires `is_published=true`.
export async function POST(
  req: Request,
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

    const willBePublished = !gallery.isPublished;

    // Optional `themeId` override from the editor (built-in themes only,
    // since their string IDs aren't UUIDs and the live DB column stores
    // NULL for them).
    let themeIdOverride: string | null | undefined;
    try {
      const body = (await req.json()) as { themeId?: string | null };
      if ("themeId" in body) themeIdOverride = body.themeId ?? null;
    } catch {
      themeIdOverride = undefined;
    }

    // When transitioning to published, capture a snapshot of the current
    // draft so the public page has a frozen version to serve.
    let snapshot = gallery.publishedSnapshot;
    let publishedAt = gallery.publishedAt;
    if (willBePublished) {
      snapshot = await buildPublishedSnapshot(id, themeIdOverride);
      publishedAt = new Date();
    }

    const [updated] = await db
      .update(linkGallery)
      .set({
        isPublished: willBePublished,
        publishedSnapshot: snapshot,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(linkGallery.id, id))
      .returning();

    // Invalidate caches so the publish state flip is reflected live.
    void purgeBioCache(updated.slug);
    try {
      revalidatePath(`/p/${updated.slug}`);
    } catch (err) {
      console.warn("[POST /api/gallery/[id]/publish] revalidatePath failed:", err);
    }

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

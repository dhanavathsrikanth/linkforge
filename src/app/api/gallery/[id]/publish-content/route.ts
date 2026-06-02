import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db, linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { buildPublishedSnapshot } from "@/lib/bio/publish-snapshot";
import { generateOgImage } from "@/lib/bio/og-image";
import type { PublishedSnapshot } from "@/types/gallery";

// ─── CF KV cache invalidation helper ─────────────────────────────────────────
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

// ─── OG image pre-generation ──────────────────────────────────────────────────
// Generates the OG image and uploads to Worker KV so the first crawler
// request never hits Vercel.
async function pregOgImage(slug: string, snapshot: PublishedSnapshot): Promise<void> {
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return;

  try {
    const imageResponse = generateOgImage(snapshot, slug);
    // ImageResponse is a Web Response — extract the PNG buffer
    const pngBuffer = await imageResponse.arrayBuffer();

    await fetch(`${workerUrl}/internal/bio/og-pregenerate?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        "x-worker-secret": workerSecret,
      },
      body: pngBuffer,
    });
  } catch (err) {
    console.warn("[pregOgImage] Failed (non-blocking):", err);
  }
}

/**
 * POST /api/gallery/[id]/publish-content
 *
 * "Update content" — pushes the current draft live by re-building the
 * `published_snapshot` from the live row + blocks. Used by the editor's
 * "Update content" button which only appears when the page is already
 * published AND has unpublished changes.
 *
 * Requires `is_published = true`. If the page is a draft, the user must
 * use the standard publish toggle instead (which also snapshots).
 */
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

    if (!gallery.isPublished) {
      return NextResponse.json(
        { error: "Gallery is not published. Publish it first." },
        { status: 409 }
      );
    }

    // Optional `themeId` override from the editor — preserves built-in
    // theme IDs (e.g. "theme-purple") that the live DB column nulls out.
    let themeIdOverride: string | null | undefined;
    try {
      const body = (await req.json()) as { themeId?: string | null };
      if ("themeId" in body) themeIdOverride = body.themeId ?? null;
    } catch {
      // No body (or malformed) — fall back to whatever's in the DB.
      themeIdOverride = undefined;
    }

    const snapshot = await buildPublishedSnapshot(id, themeIdOverride);
    const publishedAt = new Date();

    const [updated] = await db
      .update(linkGallery)
      .set({
        publishedSnapshot: snapshot,
        publishedAt,
      })
      .where(eq(linkGallery.id, id))
      .returning();

    // Invalidate caches so the new content is live immediately.
    void purgeBioCache(updated.slug);

    // Pre-generate OG image and upload to Worker KV (non-blocking)
    void pregOgImage(updated.slug, snapshot as PublishedSnapshot);

    try {
      revalidatePath(`/p/${updated.slug}`);
    } catch (err) {
      console.warn("[POST /api/gallery/[id]/publish-content] revalidatePath failed:", err);
    }

    return NextResponse.json({ gallery: updated });
  } catch (err) {
    console.error("[POST /api/gallery/[id]/publish-content]", err);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

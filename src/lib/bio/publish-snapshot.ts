import { db, linkGallery, linkGalleryBlocks } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { PublishedSnapshot, PublishedSnapshotBlock } from "@/types/gallery";

/**
 * Build a `PublishedSnapshot` from the current draft state of a gallery.
 *
 * Reads the live `link_gallery` row and its `link_gallery_blocks` rows and
 * freezes them into a single JSON document that the public `/p/[slug]`
 * route can serve without further DB lookups for content.
 *
 * `themeIdOverride` is used for built-in themes whose IDs (e.g.
 * `"theme-purple"`) aren't UUIDs and therefore can't be stored in the
 * `theme_id` column. The PATCH handler writes NULL for those, so the
 * editor must pass the chosen theme's ID through to publish/update so
 * the snapshot preserves the user's selection.
 *
 * Throws if the gallery doesn't exist — callers should have already
 * verified ownership before invoking this.
 */
export async function buildPublishedSnapshot(
  galleryId: string,
  themeIdOverride?: string | null
): Promise<PublishedSnapshot> {
  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { eq }) => eq(g.id, galleryId),
  });
  if (!gallery) {
    throw new Error(`buildPublishedSnapshot: gallery ${galleryId} not found`);
  }

  const blockRows = await db
    .select()
    .from(linkGalleryBlocks)
    .where(eq(linkGalleryBlocks.galleryId, galleryId))
    .orderBy(linkGalleryBlocks.sortOrder);

  const blocks: PublishedSnapshotBlock[] = blockRows.map((r) => ({
    id: r.id,
    type: r.type,
    sortOrder: r.sortOrder,
    config: r.config as Record<string, unknown>,
    data: r.data as Record<string, unknown>,
    visible: r.visible,
  }));

  // Prefer the explicit override (which carries built-in theme IDs that
  // can't be stored in the DB column). Fall back to the DB value (used
  // for legacy callers and custom UUID themes).
  const resolvedThemeId =
    themeIdOverride !== undefined ? themeIdOverride : gallery.themeId;

  return {
    displayName: gallery.displayName,
    bio: gallery.bio,
    avatarUrl: gallery.avatarUrl,
    avatarInitials: gallery.avatarInitials,
    avatarBgColor: gallery.avatarBgColor,
    themeId: resolvedThemeId,
    showBranding: gallery.showBranding,
    seoTitle: gallery.seoTitle,
    seoDescription: gallery.seoDescription,
    blocks,
    snapshotVersion: 1,
  };
}

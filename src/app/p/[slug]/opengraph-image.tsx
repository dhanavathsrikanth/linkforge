import { db, linkGallery } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateOgImage, generateFallbackOgImage } from "@/lib/bio/og-image";
import type { PublishedSnapshot } from "@/types/gallery";

export const runtime = "edge";
export const revalidate = 86400; // 24 hours (edge-compatible)

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Single-row read — only fetches publishedSnapshot JSON column.
  // No joins, no complex queries. Extremely fast on edge.
  const gallery = await db
    .select({ publishedSnapshot: linkGallery.publishedSnapshot })
    .from(linkGallery)
    .where(
      and(
        eq(linkGallery.slug, slug),
        eq(linkGallery.isPublished, true)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  // Fallback card when page not found or not published
  if (!gallery?.publishedSnapshot) {
    return generateFallbackOgImage();
  }

  const snapshot = gallery.publishedSnapshot as unknown as PublishedSnapshot;
  return generateOgImage(snapshot, slug);
}

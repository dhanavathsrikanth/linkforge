import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GalleryPageContent } from "@/components/gallery/preview/GalleryPageContent";
import type { GalleryPage } from "@/types/gallery";
import { DEFAULT_APPEARANCE } from "@/types/gallery";
import { trackBioPageViewed } from "@/lib/posthog";

export const revalidate = 60; // ISR — revalidate at most once per 60s
export const dynamicParams = true; // P2: serve unknown slugs on first hit, then cache

interface Params {
  slug: string;
}

// P2: empty list = no pre-built pages; dynamicParams=true lets Next.js generate on first hit
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { and, eq }) =>
      and(eq(g.slug, slug), eq(g.isPublished, true)),
  });

  if (!gallery) return { title: "Page not found" };

  const title = gallery.seoTitle ?? gallery.displayName ?? `${slug}'s page`;
  const description = gallery.seoDescription ?? gallery.bio ?? "Check out my links";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      // M3: og:image for social sharing previews
      images: gallery.avatarUrl ? [{ url: gallery.avatarUrl, width: 400, height: 400 }] : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: gallery.avatarUrl ? [gallery.avatarUrl] : [],
    },
  };
}

export default async function PublishedGalleryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { and, eq }) =>
      and(eq(g.slug, slug), eq(g.isPublished, true)),
  });

  if (!gallery) notFound();

  // Track bio page view in PostHog (non-blocking, best effort)
  trackBioPageViewed({ galleryId: gallery.id });

  const galleryPage: GalleryPage = {
    ...gallery,
    links: (gallery.links ?? []) as GalleryPage["links"],
    appearance: (gallery.appearance ?? DEFAULT_APPEARANCE) as GalleryPage["appearance"],
  };

  return (
    <main style={{ minHeight: "100vh" }}>
      <GalleryPageContent
        gallery={galleryPage}
        trackClicks
        isPreview={false}
      />
    </main>
  );
}

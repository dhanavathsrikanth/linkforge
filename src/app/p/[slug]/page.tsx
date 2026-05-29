import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BioPublicPage, type BioPublicPageData } from "@/components/bio/BioPublicPage";
import type { BioBlock, BioLayoutItem } from "@/components/bio/BioCanvas";
import { trackBioPageViewed } from "@/lib/posthog";
import { linkGalleryBlocks, bioThemes } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  DEFAULT_THEMES,
  type BioThemeColors,
  generateSysThemeCss,
} from "@/lib/bio/theme";
import { getGoogleFontUrl } from "@/lib/bio/fonts";
import type { PublishedSnapshot } from "@/types/gallery";

// ─── Caching strategy ─────────────────────────────────────────────────────────
// We render the page from the `published_snapshot` JSON column, which is
// updated atomically by /publish and /publish-content. There's no ISR
// revalidate window here — the route is dynamic, and the CF Worker (in
// prod) puts a 60s KV cache in front for edge performance. In dev, this
// guarantees changes are visible the moment "Update content" lands.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { and, eq }) => and(eq(g.slug, slug), eq(g.isPublished, true)),
  });

  if (!gallery) return { title: "Page not found" };

  // Prefer the published snapshot for SEO too — what's displayed should
  // match what's indexed.
  const snap = gallery.publishedSnapshot as PublishedSnapshot | null;
  const displayName = snap?.displayName ?? gallery.displayName;
  const bio = snap?.bio ?? gallery.bio;
  const seoTitle = snap?.seoTitle ?? gallery.seoTitle;
  const seoDescription = snap?.seoDescription ?? gallery.seoDescription;

  const title = seoTitle ?? displayName ?? `${slug}'s page`;
  const description = seoDescription ?? bio ?? "Check out my links";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pivoturl.com";
  const ogImageUrl = `${appUrl}/p/${slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${appUrl}/p/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${title} — PivotUrl`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublishedBioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { and, eq }) => and(eq(g.slug, slug), eq(g.isPublished, true)),
  });

  if (!gallery) notFound();

  // ── Resolve content source: published snapshot vs. legacy live row ───────
  // New galleries always read from `published_snapshot` (frozen at
  // publish/update-content). Galleries published before this column
  // existed have `published_snapshot = null`; for those we fall back to
  // the live row + blocks so they keep working until the next publish.
  const snap = gallery.publishedSnapshot as PublishedSnapshot | null;

  let blocks: BioBlock[];
  let smLayout: BioLayoutItem[];
  let xxsLayout: BioLayoutItem[];
  let displayName: string | null;
  let bio: string | null;
  let avatarUrl: string | null;
  let avatarInitials: string | null;
  let avatarBgColor: string;
  let showBranding: boolean;
  let themeId: string | null;

  if (snap) {
    // ── Snapshot path ─────────────────────────────────────────────────────
    displayName = snap.displayName;
    bio = snap.bio;
    avatarUrl = snap.avatarUrl;
    avatarInitials = snap.avatarInitials;
    avatarBgColor = snap.avatarBgColor;
    showBranding = snap.showBranding;
    themeId = snap.themeId;

    const visibleSnapBlocks = snap.blocks
      .filter((b) => b.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    blocks = snap.blocks.map((b) => {
      const config = { ...(b.config ?? {}) };
      delete (config as Record<string, unknown>).__position;
      delete (config as Record<string, unknown>).__positionXxs;
      delete (config as Record<string, unknown>).__theme;
      return {
        id: b.id,
        type: b.type,
        config,
        data: b.data ?? {},
        visible: b.visible,
        sortOrder: b.sortOrder,
      } satisfies BioBlock;
    });

    smLayout = visibleSnapBlocks.map((b, i) => {
      const cfg = b.config as Record<string, unknown>;
      const pos = cfg.__position as
        | { x: number; y: number; w: number; h: number }
        | undefined;
      return {
        i: b.id,
        x: pos?.x ?? 0,
        y: pos?.y ?? i * 6,
        w: pos?.w ?? 12,
        h: pos?.h ?? 2,
      };
    });

    let xxsCursor = 0;
    xxsLayout = visibleSnapBlocks.map((b) => {
      const cfg = b.config as Record<string, unknown>;
      const pos = cfg.__positionXxs as
        | { x: number; y: number; w: number; h: number }
        | undefined;
      if (pos) return { i: b.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h };
      const item = { i: b.id, x: 0, y: xxsCursor, w: 4, h: 2 };
      xxsCursor += 2;
      return item;
    });
  } else {
    // ── Legacy fallback: read from live blocks table ──────────────────────
    displayName = gallery.displayName;
    bio = gallery.bio;
    avatarUrl = gallery.avatarUrl;
    avatarInitials = gallery.avatarInitials;
    avatarBgColor = gallery.avatarBgColor;
    showBranding = gallery.showBranding;
    themeId = gallery.themeId;

    const blockRows = await db
      .select()
      .from(linkGalleryBlocks)
      .where(eq(linkGalleryBlocks.galleryId, gallery.id))
      .orderBy(linkGalleryBlocks.sortOrder);

    blocks = blockRows.map((r) => {
      const config = { ...(r.config as Record<string, unknown>) };
      delete config.__position;
      delete config.__positionXxs;
      delete config.__theme;
      return {
        id: r.id,
        type: r.type,
        config,
        data: r.data as Record<string, unknown>,
        visible: r.visible,
        sortOrder: r.sortOrder,
      };
    });

    const visibleRows = blockRows.filter((r) => r.visible);

    smLayout = visibleRows.map((r, i) => {
      const pos = (r.config as Record<string, unknown>).__position as
        | { x: number; y: number; w: number; h: number }
        | undefined;
      return {
        i: r.id,
        x: pos?.x ?? 0,
        y: pos?.y ?? i * 6,
        w: pos?.w ?? 12,
        h: pos?.h ?? 2,
      };
    });

    let xxsCursor = 0;
    xxsLayout = visibleRows.map((r) => {
      const pos = (r.config as Record<string, unknown>).__positionXxs as
        | { x: number; y: number; w: number; h: number }
        | undefined;
      if (pos) return { i: r.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h };
      const item = { i: r.id, x: 0, y: xxsCursor, w: 4, h: 2 };
      xxsCursor += 2;
      return item;
    });
  }

  // ── Resolve theme ─────────────────────────────────────────────────────────
  let themeColors: BioThemeColors;
  let themeFont: string | null = null;
  let themeBgImage: string | null = null;

  if (themeId) {
    // 1. Check built-in themes first (their IDs are non-UUID strings like "theme-default")
    const builtIn = Object.values(DEFAULT_THEMES).find((t) => t.id === themeId);
    if (builtIn) {
      themeColors = builtIn.colors;
      themeFont = builtIn.font;
      themeBgImage = builtIn.backgroundImage;
    } else {
      // 2. Try to load as a custom DB theme (UUID)
      const dbTheme = await db.query.bioThemes.findFirst({
        where: eq(bioThemes.id, themeId),
      });
      if (dbTheme) {
        themeColors = {
          colorBgBase:        dbTheme.colorBgBase        ?? { h: 60, s: 0.0476, l: 0.96 },
          colorBgPrimary:     dbTheme.colorBgPrimary     ?? { h: 0, s: 0, l: 1 },
          colorBgSecondary:   dbTheme.colorBgSecondary   ?? { h: 0, s: 0, l: 0.9 },
          colorBorderPrimary: dbTheme.colorBorderPrimary ?? { h: 0, s: 0, l: 0.9176 },
          colorTitlePrimary:  dbTheme.colorTitlePrimary  ?? { h: 240, s: 0.0345, l: 0.1137 },
          colorTitleSecondary:dbTheme.colorTitleSecondary?? { h: 0, s: 0, l: 0.16 },
          colorLabelPrimary:  dbTheme.colorLabelPrimary  ?? { h: 240, s: 0.0345, l: 0.1137 },
          colorLabelSecondary:dbTheme.colorLabelSecondary?? { h: 0, s: 0, l: 0.16 },
          colorLabelTertiary: dbTheme.colorLabelTertiary ?? { h: 0, s: 0, l: 0.9804 },
        };
        themeFont = dbTheme.font;
        themeBgImage = dbTheme.backgroundImage;
      } else {
        themeColors = DEFAULT_THEMES.Default.colors;
      }
    }
  } else {
    themeColors = DEFAULT_THEMES.Default.colors;
  }

  // Generate --sys-* CSS variables scoped to :root
  const themeCss = generateSysThemeCss(themeColors!, themeFont, themeBgImage, ":root");
  const fontUrl = themeFont ? getGoogleFontUrl(themeFont) : null;

  // ── Track page view (non-blocking) ────────────────────────────────────────
  // Fire to PostHog for product analytics
  await trackBioPageViewed({ galleryId: gallery.id }).catch(() => {});

  // Fire to our own analytics table directly (page-level view event)
  // We use a synthetic blockId = galleryId and blockType = "page"
  // This is done via the internal analytics endpoint to avoid FK issues
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  fetch(`${appUrl}/api/bio/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ galleryId: gallery.id }),
  }).catch(() => {});

  const pageData: BioPublicPageData = {
    id: gallery.id,
    slug: gallery.slug,
    displayName,
    bio,
    avatarUrl,
    avatarInitials,
    avatarBgColor,
    showBranding,
    blocks,
    smLayout,
    xxsLayout,
  };

  return (
    <>
      {/* Inject theme CSS variables */}
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      {/* Load custom font if set */}
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      <BioPublicPage page={pageData} />
    </>
  );
}

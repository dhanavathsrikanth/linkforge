import { db, linkGallery, linkGalleryBlocks, domains } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type { BioBlock, BioLayoutItem } from "@/components/bio/BioCanvas";
import type { BioPageData, BioDomain } from "@/components/bio/BioEditor";
import { DEFAULT_THEMES } from "@/lib/bio/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BioListItem {
  id: string;
  slug: string;
  displayName: string | null;
  isPublished: boolean;
  themeId: string | null;
  customDomain: string | null;
  blockCount: number;
  updatedAt: Date;
  createdAt: Date;
}

// ─── Fetch list for the current user ─────────────────────────────────────────

/**
 * Returns every bio page belonging to the user, ordered by most-recently
 * updated. Used by `/dashboard/bio` (the list page).
 */
export async function fetchBiosForUser(userDbId: string): Promise<BioListItem[]> {
  const rows = await db
    .select({
      id: linkGallery.id,
      slug: linkGallery.slug,
      displayName: linkGallery.displayName,
      isPublished: linkGallery.isPublished,
      themeId: linkGallery.themeId,
      customDomainId: linkGallery.customDomainId,
      updatedAt: linkGallery.updatedAt,
      createdAt: linkGallery.createdAt,
    })
    .from(linkGallery)
    .where(eq(linkGallery.userId, userDbId))
    .orderBy(linkGallery.updatedAt);

  if (rows.length === 0) return [];

  // Resolve custom domain strings + count blocks per gallery in two
  // parallel batches rather than N+1 round-trips.
  const galleryIds = rows.map((r) => r.id);
  const [blockCounts, domainRows] = await Promise.all([
    db
      .select({
        galleryId: linkGalleryBlocks.galleryId,
        type: linkGalleryBlocks.type,
      })
      .from(linkGalleryBlocks)
      .where(
        // Drizzle's `inArray` would be cleaner but importing it just for
        // this one use is overkill — a single OR-filter is fine.
        eq(linkGalleryBlocks.galleryId, galleryIds[0])
      ),
    db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains),
  ]);

  // For multi-gallery counts, fall back to per-row queries when there's
  // more than one bio page. Most users only have a single page so the
  // single-query happy path above covers that case.
  let counts = new Map<string, number>();
  if (galleryIds.length === 1) {
    counts.set(galleryIds[0], blockCounts.length);
  } else {
    for (const id of galleryIds) {
      const cnt = await db
        .select({ count: linkGalleryBlocks.id })
        .from(linkGalleryBlocks)
        .where(eq(linkGalleryBlocks.galleryId, id));
      counts.set(id, cnt.length);
    }
  }

  const domainsById = new Map(domainRows.map((d) => [d.id, d.domain]));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    displayName: r.displayName,
    isPublished: r.isPublished,
    themeId: r.themeId,
    customDomain: r.customDomainId ? domainsById.get(r.customDomainId) ?? null : null,
    blockCount: counts.get(r.id) ?? 0,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
  })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

// ─── Fetch a single bio with editor-shaped data ──────────────────────────────

/**
 * Fetches a bio page by ID and returns it shaped as `BioPageData` (the
 * structure the editor expects) plus the workspace's verified domains.
 * Returns null when the bio doesn't exist or doesn't belong to the
 * caller — callers should `notFound()` or redirect on null.
 */
export async function fetchBioForEditor(
  galleryId: string,
  userDbId: string
): Promise<{ pageData: BioPageData; domains: BioDomain[] } | null> {
  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { eq, and }) =>
      and(eq(g.id, galleryId), eq(g.userId, userDbId)),
  });
  if (!gallery) return null;

  const [blockRows, workspaceDomains] = await Promise.all([
    db
      .select()
      .from(linkGalleryBlocks)
      .where(eq(linkGalleryBlocks.galleryId, gallery.id))
      .orderBy(linkGalleryBlocks.sortOrder),
    db
      .select({
        id: domains.id,
        domain: domains.domain,
        cfHostnameStatus: domains.cfHostnameStatus,
      })
      .from(domains)
      .where(
        and(
          eq(domains.workspaceId, gallery.workspaceId),
          eq(domains.verified, true)
        )
      ),
  ]);

  const blocks: BioBlock[] = blockRows.map((r) => {
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

  const smLayout: BioLayoutItem[] = blockRows.map((r, i) => {
    const cfg = r.config as Record<string, unknown>;
    const pos = cfg.__position as
      | { x: number; y: number; w: number; h: number }
      | undefined;
    return {
      i: r.id,
      x: pos?.x ?? 0,
      y: pos?.y ?? i * 6,
      w: pos?.w ?? 12,
      h: pos?.h ?? 2,
      minW: 4,
      minH: 2,
    } satisfies BioLayoutItem;
  });

  let xxsCursor = 0;
  const xxsLayout: BioLayoutItem[] = blockRows.map((r) => {
    const cfg = r.config as Record<string, unknown>;
    const pos = cfg.__positionXxs as
      | { x: number; y: number; w: number; h: number }
      | undefined;
    if (pos) {
      return {
        i: r.id,
        x: pos.x,
        y: pos.y,
        w: pos.w,
        h: pos.h,
        minW: 4,
        minH: 2,
      } satisfies BioLayoutItem;
    }
    const item: BioLayoutItem = {
      i: r.id,
      x: 0,
      y: xxsCursor,
      w: 4,
      h: 2,
      minW: 4,
      minH: 2,
    };
    xxsCursor += 2;
    return item;
  });

  const pageData: BioPageData = {
    id: gallery.id,
    slug: gallery.slug,
    isPublished: gallery.isPublished,
    displayName: gallery.displayName,
    bio: gallery.bio,
    avatarUrl: gallery.avatarUrl,
    avatarInitials: gallery.avatarInitials,
    avatarBgColor: gallery.avatarBgColor,
    seoTitle: gallery.seoTitle,
    seoDescription: gallery.seoDescription,
    showBranding: gallery.showBranding,
    themeId: gallery.themeId ?? DEFAULT_THEMES.Default.id,
    customDomainId: gallery.customDomainId ?? null,
    blocks,
    smLayout,
    xxsLayout,
    updatedAt: gallery.updatedAt,
    publishedAt: gallery.publishedAt ?? null,
  };

  const bioDomains: BioDomain[] = workspaceDomains.map((d) => ({
    id: d.id,
    domain: d.domain,
    cfHostnameStatus: d.cfHostnameStatus ?? null,
  }));

  return { pageData, domains: bioDomains };
}

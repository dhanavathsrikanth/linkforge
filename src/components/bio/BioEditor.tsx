"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BioEditProvider } from "@/contexts/BioEditContext";
import { BioEditorSidebar } from "@/components/bio/BioEditorSidebar";
import { BioCanvas, type BioBlock, type BioLayoutItem } from "@/components/bio/BioCanvas";
import {
  DEFAULT_THEMES,
  type ThemeName,
  type BioThemeColors,
  generateSysThemeCss,
} from "@/lib/bio/theme";
import { Loader2, CheckCircle2, ExternalLink, Globe, Share2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { BioShareModal } from "@/components/bio/BioShareModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BioDomain {
  id: string;
  domain: string;
  cfHostnameStatus: string | null;
}

export interface BioPageData {
  id: string;
  slug: string;
  isPublished: boolean;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarInitials: string | null;
  avatarBgColor: string;
  seoTitle: string | null;
  seoDescription: string | null;
  showBranding: boolean;
  themeId: string | null;
  customDomainId: string | null;
  blocks: BioBlock[];
  smLayout: BioLayoutItem[];
  xxsLayout: BioLayoutItem[];
  updatedAt: Date;
  /**
   * When the user last clicked Publish or Update content. `null` when
   * the page has never been published. Compared against `updatedAt` to
   * decide whether the editor shows "Update content" (drift exists) or
   * just "Live" (snapshot is current).
   */
  publishedAt: Date | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({
  status,
  isPublished,
  hasUnpublishedChanges,
}: {
  status: SaveStatus;
  isPublished?: boolean;
  hasUnpublishedChanges?: boolean;
}) {
  if (status === "idle") return null;
  // "Saved" copy depends on publish state:
  //   - draft: "Saved" (this is the only place changes live)
  //   - published, snapshot is current: "Live"
  //   - published, snapshot is stale: "Draft saved" — primes the user to
  //     hit the "Update content" button visible to the right.
  const savedLabel = !isPublished
    ? "Saved"
    : hasUnpublishedChanges
    ? "Draft saved"
    : "Live";
  const savingLabel = "Saving…";
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${
        status === "saving"
          ? "text-stone-400"
          : status === "saved"
          ? "text-green-600"
          : "text-red-500"
      }`}
    >
      {status === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "saved" && <CheckCircle2 className="w-3 h-3" />}
      {status === "saving" ? savingLabel : status === "saved" ? savedLabel : "Save failed"}
    </div>
  );
}

// ─── Theme CSS injector ───────────────────────────────────────────────────────
// Handles both built-in themes (by ID lookup in DEFAULT_THEMES) and
// custom themes (fetched from /api/bio/themes/:id on demand).
//
// We scope the injected variables to `.bio-canvas-root.themed` (higher
// specificity than the no-theme fallback in globals.css) so the runtime
// theme always wins the cascade regardless of stylesheet load order.

const THEME_SELECTOR = ".bio-canvas-root.themed";

function ThemeStyle({ themeId }: { themeId: string | null }) {
  const [css, setCss] = useState<string>(() => {
    // Synchronously resolve built-in themes to avoid flash
    if (!themeId) return buildCssFromBuiltIn("Default");
    const builtIn = Object.entries(DEFAULT_THEMES).find(([, t]) => t.id === themeId);
    if (builtIn) return buildCssFromBuiltIn(builtIn[0] as ThemeName);
    return buildCssFromBuiltIn("Default"); // fallback until async fetch
  });

  useEffect(() => {
    if (!themeId) {
      setCss(buildCssFromBuiltIn("Default"));
      return;
    }
    // Built-in theme — resolve synchronously
    const builtIn = Object.entries(DEFAULT_THEMES).find(([, t]) => t.id === themeId);
    if (builtIn) {
      setCss(buildCssFromBuiltIn(builtIn[0] as ThemeName));
      return;
    }
    // Custom theme — fetch from API
    fetch(`/api/bio/themes/${themeId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (!body?.theme) return;
        const t = body.theme;
        const DEFAULT = DEFAULT_THEMES.Default.colors;
        const colors: BioThemeColors = {
          colorBgBase:        t.colorBgBase        ?? DEFAULT.colorBgBase,
          colorBgPrimary:     t.colorBgPrimary     ?? DEFAULT.colorBgPrimary,
          colorBgSecondary:   t.colorBgSecondary   ?? DEFAULT.colorBgSecondary,
          colorBorderPrimary: t.colorBorderPrimary ?? DEFAULT.colorBorderPrimary,
          colorTitlePrimary:  t.colorTitlePrimary  ?? DEFAULT.colorTitlePrimary,
          colorTitleSecondary:t.colorTitleSecondary?? DEFAULT.colorTitleSecondary,
          colorLabelPrimary:  t.colorLabelPrimary  ?? DEFAULT.colorLabelPrimary,
          colorLabelSecondary:t.colorLabelSecondary?? DEFAULT.colorLabelSecondary,
          colorLabelTertiary: t.colorLabelTertiary ?? DEFAULT.colorLabelTertiary,
        };
        setCss(generateSysThemeCss(colors, t.font ?? null, t.backgroundImage ?? null, THEME_SELECTOR) +
          (t.font ? `\n${THEME_SELECTOR} { font-family: '${t.font}', sans-serif; }` : ""));
      })
      .catch(() => {});
  }, [themeId]);

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

function buildCssFromBuiltIn(name: ThemeName): string {
  const theme = DEFAULT_THEMES[name];
  const css = generateSysThemeCss(theme.colors, theme.font, null, THEME_SELECTOR);
  const fontCss = theme.font ? `\n${THEME_SELECTOR} { font-family: '${theme.font}', sans-serif; }` : "";
  return css + fontCss;
}

// ─── BioEditor ────────────────────────────────────────────────────────────────

interface BioEditorProps {
  initialData: BioPageData;
  domains?: BioDomain[];
}

export function BioEditor({ initialData, domains = [] }: BioEditorProps) {
  const [page, setPage] = useState<BioPageData>(initialData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Remember the slug we loaded with — we only send `slug` to the API when
  // the user explicitly changes it. Re-sending the unchanged slug on every
  // auto-save trips the API's strict slug regex when legacy galleries have
  // a slug from before the validation rules tightened.
  const initialSlugRef = useRef(initialData.slug);

  // Track the latest server-known `updatedAt` in a ref so back-to-back
  // saves don't race each other into a 409 conflict. React state updates
  // asynchronously — by the time the next drag fires, `page.updatedAt`
  // may still hold the previous server timestamp, but this ref is updated
  // synchronously the instant the previous save's response lands.
  const lastServerUpdatedAtRef = useRef<Date | string | null>(initialData.updatedAt);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the most-recently-queued draft snapshot — used by
  // `flushPendingSave` to short-circuit the debounce when we need to
  // guarantee the server is in sync (e.g. before "Update content").
  const pendingSaveRef = useRef<BioPageData | null>(null);
  // The in-flight save promise. `flushPendingSave` awaits this when a
  // save is already running so we don't double-fire.
  const inFlightSaveRef = useRef<Promise<void> | null>(null);

  // ─── Auto-save (debounced 1.5s) ─────────────────────────────────────────
  // Performs a single save round-trip immediately. Extracted so both the
  // debounced wrapper and `flushPendingSave` use the exact same logic.
  const performSave = useCallback(async (updated: BioPageData): Promise<void> => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: updated.displayName,
          bio: updated.bio,
          avatarInitials: updated.avatarInitials,
          avatarBgColor: updated.avatarBgColor,
          // Merge layout positions back into block config for storage.
          // We store BOTH desktop (__position) and mobile (__positionXxs)
          // so toggling between modes doesn't lose user-tuned positions.
          blocks: updated.blocks.map((b, i) => {
            const smPos = updated.smLayout.find((l) => l.i === b.id);
            const xxsPos = updated.xxsLayout.find((l) => l.i === b.id);
            const baseConfig = { ...b.config };
            // Strip any stale internal keys before re-applying
            delete (baseConfig as Record<string, unknown>).__position;
            delete (baseConfig as Record<string, unknown>).__positionXxs;
            return {
              id: b.id,
              type: b.type,
              sortOrder: i,
              config: {
                ...baseConfig,
                ...(smPos
                  ? { __position: { x: smPos.x, y: smPos.y, w: smPos.w, h: smPos.h } }
                  : {}),
                ...(xxsPos
                  ? { __positionXxs: { x: xxsPos.x, y: xxsPos.y, w: xxsPos.w, h: xxsPos.h } }
                  : {}),
              },
              data: b.data,
              visible: b.visible,
            };
          }),
          seoTitle: updated.seoTitle,
          seoDescription: updated.seoDescription,
          showBranding: updated.showBranding,
          // Only send slug when the user actually changed it. The API
          // applies a strict regex and re-sending an unchanged legacy
          // slug would 422 every save.
          ...(updated.slug !== initialSlugRef.current ? { slug: updated.slug } : {}),
          themeId: updated.themeId,
          customDomainId: updated.customDomainId,
          // Multi-bio: tell the API which gallery to update.
          id: updated.id,
          // Use the ref instead of state — back-to-back saves can fire
          // before the previous response has flowed through setState.
          updatedAt: lastServerUpdatedAtRef.current ?? updated.updatedAt,
        }),
      });

      if (res.status === 409) {
        const body = await res.json();
        if (body.error === "conflict") {
          // Conflict can happen during rapid edits when our cached
          // `updatedAt` lags the server. The server's response includes
          // its current timestamp via the next GET — but to keep the
          // UX non-blocking, just refresh our ref from a follow-up
          // GET and surface a soft "out of sync" hint via the indicator.
          // No more disruptive `window.alert` on every drag.
          try {
            const fresh = await fetch("/api/gallery", { method: "GET" });
            if (fresh.ok) {
              const freshBody = await fresh.json();
              if (freshBody.gallery?.updatedAt) {
                lastServerUpdatedAtRef.current = freshBody.gallery.updatedAt;
              }
            }
          } catch {
            /* ignore */
          }
          setSaveStatus("error");
          // eslint-disable-next-line no-console
          console.warn("[BioEditor] save 409 — out of sync; ref refreshed, next save should succeed");
          return;
        }
      }

      if (!res.ok) {
        // Surface the server's actual error so we can debug schema /
        // rate-limit / validation failures instead of silently flipping
        // the indicator to "Save failed".
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) {
            detail += `: ${typeof body.error === "string" ? body.error : JSON.stringify(body.error)}`;
          }
          if (body?.detail) {
            detail += ` — ${body.detail}`;
          }
        } catch {
          /* response wasn't JSON */
        }
        // eslint-disable-next-line no-console
        console.error("[BioEditor] save failed —", detail);
        throw new Error(detail);
      }
      const body = await res.json();
      // Update the conflict-detection ref synchronously so the next
      // queued save (which may already be debounced and about to fire)
      // uses the freshest server timestamp.
      if (body.gallery?.updatedAt) {
        lastServerUpdatedAtRef.current = body.gallery.updatedAt;
      }
      setPage((p) => {
        // If the server returned the freshly-saved block rows, sync our
        // block IDs to match (the API regenerates UUIDs for any blocks
        // whose client-supplied id wasn't a valid UUID). Order matches
        // the request order so we can zip them together.
        let blocks = p.blocks;
        let smLayout = p.smLayout;
        let xxsLayout = p.xxsLayout;
        if (Array.isArray(body.blocks) && body.blocks.length === p.blocks.length) {
          const idMap = new Map<string, string>();
          blocks = p.blocks.map((b, i) => {
            const serverBlock = body.blocks[i] as { id: string };
            if (serverBlock.id !== b.id) idMap.set(b.id, serverBlock.id);
            return { ...b, id: serverBlock.id };
          });
          if (idMap.size > 0) {
            const remap = (items: BioLayoutItem[]) =>
              items.map((l) => ({ ...l, i: idMap.get(l.i) ?? l.i }));
            smLayout = remap(p.smLayout);
            xxsLayout = remap(p.xxsLayout);
          }
        }
        return {
          ...p,
          blocks,
          smLayout,
          xxsLayout,
          updatedAt: body.gallery.updatedAt,
          slug: body.gallery.slug ?? p.slug,
        };
      });
      // Sync the slug baseline so future auto-saves don't re-send an
      // unchanged slug (and trigger the strict regex).
      if (body.gallery?.slug) initialSlugRef.current = body.gallery.slug;
      setSaveStatus("saved");

      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      throw new Error("save failed");
    }
  }, []);

  // Debounced wrapper. Stashes the latest draft on `pendingSaveRef` so
  // `flushPendingSave` can pick it up if the user hits "Update content"
  // before the timer fires.
  const triggerSave = useCallback(
    (updated: BioPageData) => {
      pendingSaveRef.current = updated;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(() => {
        const draft = pendingSaveRef.current;
        if (!draft) return;
        pendingSaveRef.current = null;
        const p = performSave(draft).catch(() => {});
        inFlightSaveRef.current = p;
        p.finally(() => {
          if (inFlightSaveRef.current === p) inFlightSaveRef.current = null;
        });
      }, 1500);
    },
    [performSave]
  );

  // Synchronous flush — used before "Update content" / "Publish" so the
  // server has the latest draft before we ask it to snapshot.
  const flushPendingSave = useCallback(async (): Promise<void> => {
    // 1. If a save is currently running, wait for it.
    if (inFlightSaveRef.current) {
      try {
        await inFlightSaveRef.current;
      } catch {
        /* swallowed — the live indicator already surfaced the error */
      }
    }
    // 2. If a save is queued (debounce timer running), cancel and run
    //    it immediately so the snapshot endpoint sees the latest data.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const queued = pendingSaveRef.current;
    if (queued) {
      pendingSaveRef.current = null;
      const p = performSave(queued).catch(() => {});
      inFlightSaveRef.current = p;
      try {
        await p;
      } finally {
        if (inFlightSaveRef.current === p) inFlightSaveRef.current = null;
      }
    }
  }, [performSave]);

  function update(patch: Partial<BioPageData>) {
    const next = { ...page, ...patch };
    setPage(next);
    triggerSave(next);
  }

  // ─── Block visibility toggle ─────────────────────────────────────────────
  const handleBlockVisibilityToggle = useCallback(
    (blockId: string) => {
      update({
        blocks: page.blocks.map((b) =>
          b.id === blockId ? { ...b, visible: !b.visible } : b
        ),
      });
    },
    [page]
  );

  // ─── Block reorder (from "My Blocks" list) ───────────────────────────────
  // Reorder also reflows both grid layouts so the canvas reflects the new
  // order on the desktop and mobile breakpoints. We stack the blocks
  // vertically in the new order, preserving each block's existing width
  // and height, and reset x to 0.
  const handleBlockReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      const reordered = [...page.blocks];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const reorderedBlocks = reordered.map((b, i) => ({ ...b, sortOrder: i }));

      // Helper: rebuild a layout in the order of `reorderedBlocks`,
      // stacking items vertically and preserving each block's w/h.
      const reflow = (
        existing: BioLayoutItem[],
        defaultW: number
      ): BioLayoutItem[] => {
        const byId = new Map(existing.map((l) => [l.i, l]));
        let cursor = 0;
        return reorderedBlocks.map((block) => {
          const prev = byId.get(block.id);
          const w = prev?.w ?? defaultW;
          const h = prev?.h ?? 2;
          const item: BioLayoutItem = {
            i: block.id,
            x: 0,
            y: cursor,
            w,
            h,
            minW: prev?.minW ?? 4,
            minH: prev?.minH ?? 2,
          };
          cursor += h;
          return item;
        });
      };

      update({
        blocks: reorderedBlocks,
        smLayout: reflow(page.smLayout, 12),
        xxsLayout: reflow(page.xxsLayout, 4),
      });
    },
    [page]
  );

  // ─── Block operations ────────────────────────────────────────────────────
  const handleBlockAdd = useCallback(
    (type: string, layoutItem: BioLayoutItem, defaultConfig: Record<string, unknown>) => {
      const newBlock: BioBlock = {
        id: layoutItem.i,
        type,
        config: defaultConfig,
        data: {},
        visible: true,
        sortOrder: page.blocks.length,
      };
      const newSmLayout = [...page.smLayout, layoutItem];
      // Always stack new blocks at the bottom of the mobile (xxs) layout —
      // dropping in desktop view shouldn't push other mobile blocks around.
      const xxsBottom = page.xxsLayout.reduce(
        (max, l) => Math.max(max, l.y + l.h),
        0
      );
      const newXxsLayout = [
        ...page.xxsLayout,
        {
          i: layoutItem.i,
          x: 0,
          y: xxsBottom,
          w: Math.min(layoutItem.w, 4),
          h: layoutItem.h,
          minW: 4,
          minH: 2,
        } satisfies BioLayoutItem,
      ];
      update({
        blocks: [...page.blocks, newBlock],
        smLayout: newSmLayout,
        xxsLayout: newXxsLayout,
      });
    },
    [page]
  );

  const handleBlockDelete = useCallback(
    (blockId: string) => {
      update({
        blocks: page.blocks.filter((b) => b.id !== blockId),
        smLayout: page.smLayout.filter((l) => l.i !== blockId),
        xxsLayout: page.xxsLayout.filter((l) => l.i !== blockId),
      });
    },
    [page]
  );

  const handleLayoutChange = useCallback(
    (sm: BioLayoutItem[], xxs: BioLayoutItem[]) => {
      // Bail if nothing actually changed — defends against React-Grid-Layout
      // emitting equivalent layouts after internal compaction. Without this
      // guard, BioCanvas re-renders, RGL re-syncs, and the cycle repeats.
      const sig = (items: BioLayoutItem[]) =>
        JSON.stringify(
          items
            .map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
            .sort((a, b) => a.i.localeCompare(b.i))
        );
      setPage((prev) => {
        if (sig(sm) === sig(prev.smLayout) && sig(xxs) === sig(prev.xxsLayout)) {
          return prev;
        }
        const next = { ...prev, smLayout: sm, xxsLayout: xxs };
        triggerSave(next);
        return next;
      });
    },
    [triggerSave]
  );

  // ─── Publish toggle ──────────────────────────────────────────────────────
  // Whether the live snapshot is older than the latest draft save. Used to
  // decide whether to show the "Update content" button. We treat any
  // missing publishedAt as "no live snapshot" so a freshly-published page
  // with no edits looks current.
  const draftIsAhead = (() => {
    if (!page.isPublished) return false;
    if (!page.publishedAt) return true; // legacy published rows w/o snapshot
    const updated =
      page.updatedAt instanceof Date
        ? page.updatedAt.getTime()
        : new Date(page.updatedAt).getTime();
    const published =
      page.publishedAt instanceof Date
        ? page.publishedAt.getTime()
        : new Date(page.publishedAt).getTime();
    // Allow ~1s clock drift so the indicator doesn't flicker between
    // "Live" and "Update content" right after a publish round-trip.
    return updated - published > 1000;
  })();
  const hasUnpublishedChanges = draftIsAhead;

  async function handlePublishToggle() {
    setIsPublishing(true);
    try {
      // Flush any pending autosave so a draft → published transition
      // snapshots the *latest* state, not whatever was on disk before
      // the most recent edit.
      await flushPendingSave();
      const res = await fetch(`/api/gallery/${page.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send themeId so the snapshot captures built-in theme IDs
        // (e.g. "theme-purple") that the live DB column nulls out.
        body: JSON.stringify({ themeId: page.themeId }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setPage((p) => ({
        ...p,
        isPublished: body.gallery.isPublished,
        publishedAt: body.gallery.publishedAt
          ? new Date(body.gallery.publishedAt)
          : p.publishedAt,
      }));
    } catch {
      alert("Failed to update publish state. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  }

  // ─── Update content (re-snapshot draft → live) ──────────────────────────
  async function handleUpdateContent() {
    setIsPublishing(true);
    try {
      // Critical: flush any pending autosave so the snapshot endpoint
      // reads the latest draft from the DB. Without this, a fresh theme
      // change (still in the 1.5s debounce window) would be missed and
      // we'd snapshot the previous theme.
      await flushPendingSave();
      const res = await fetch(`/api/gallery/${page.id}/publish-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send themeId so the snapshot preserves built-in theme IDs
        // (the live `theme_id` column is NULL for built-ins).
        body: JSON.stringify({ themeId: page.themeId }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setPage((p) => ({
        ...p,
        publishedAt: body.gallery.publishedAt
          ? new Date(body.gallery.publishedAt)
          : new Date(),
      }));
    } catch {
      alert("Failed to update live content. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  }

  // ─── Theme select ────────────────────────────────────────────────────────
  function handleSelectTheme(themeId: string) {
    update({ themeId });
  }

  // ─── Block form save ─────────────────────────────────────────────────────
  function handleBlockSave(blockId: string, config: Record<string, unknown>) {
    update({
      blocks: page.blocks.map((b) =>
        b.id === blockId ? { ...b, config } : b
      ),
    });
  }

  return (
    <BioEditProvider
        blocks={page.blocks}
        onBlockVisibilityToggle={handleBlockVisibilityToggle}
        onBlockReorder={handleBlockReorder}
        onBlockDelete={handleBlockDelete}
      >
      {/* Inject theme CSS variables scoped to .bio-canvas-root */}
      <ThemeStyle themeId={page.themeId} />

      <div className="flex h-full overflow-hidden bg-white relative">
        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 h-[58px] flex items-center justify-between gap-2 px-3 sm:px-4 bg-white border-b border-stone-200 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back to bio list — direct path out of the full-page editor.
                The list is the natural parent now that we have multiple
                bio pages per user. */}
            <Link
              href="/dashboard/bio"
              className="flex items-center gap-1 px-1 sm:px-2 py-1 -mx-1 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
              aria-label="Back to bio pages"
              title="Back to bio pages"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:hidden md:inline text-xs font-medium">
                Pages
              </span>
            </Link>
            <span className="hidden sm:inline text-stone-300" aria-hidden>
              /
            </span>
            <h1 className="hidden sm:block text-sm font-bold text-stone-900 tracking-tight shrink-0 max-w-[180px] truncate">
              {page.displayName || "Untitled page"}
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  page.isPublished ? "bg-green-500" : "bg-stone-400"
                }`}
              />
              <span className="text-xs text-stone-500">
                {page.isPublished ? "Published" : "Draft"}
              </span>
            </div>
            {/* Save indicator hidden on very narrow widths to avoid
                pushing the publish button off-screen. */}
            <div className="hidden sm:block">
              <SaveIndicator
                status={saveStatus}
                isPublished={page.isPublished}
                hasUnpublishedChanges={hasUnpublishedChanges}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {page.isPublished && (
              <a
                href={`/p/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors cursor-pointer"
                title="View live page"
                aria-label="View live page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {page.isPublished && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer"
                title="Share your page"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            )}
            {/* Mobile-only icon-only Share button */}
            {page.isPublished && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="sm:hidden p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer"
                aria-label="Share your page"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {/* ── Publish state machine ─────────────────────────────
                State 1 — Draft (never published):
                  Single "Publish" button (primary).
                State 2 — Published, snapshot in sync:
                  "Unpublish" button (secondary).
                State 3 — Published, has unpublished changes:
                  "Update content" (primary) + small "Unpublish" (ghost).
                Saving spinner is shared across all three.
                ─────────────────────────────────────────────────────── */}
            {!page.isPublished && (
              <button
                type="button"
                onClick={handlePublishToggle}
                disabled={isPublishing}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Globe className="w-3.5 h-3.5" />
                )}
                <span>Publish</span>
              </button>
            )}

            {page.isPublished && hasUnpublishedChanges && (
              <>
                <button
                  type="button"
                  onClick={handleUpdateContent}
                  disabled={isPublishing}
                  title="Push your latest edits to the live page"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-60"
                >
                  {isPublishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  <span>Update content</span>
                </button>
                <button
                  type="button"
                  onClick={handlePublishToggle}
                  disabled={isPublishing}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60"
                >
                  Unpublish
                </button>
              </>
            )}

            {page.isPublished && !hasUnpublishedChanges && (
              <button
                type="button"
                onClick={handlePublishToggle}
                disabled={isPublishing}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 disabled:opacity-60"
              >
                {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Globe className="w-3.5 h-3.5" />
                <span>Unpublish</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Body (below top bar) ──────────────────────────────────── */}
        {/* Bottom padding on mobile reserves room for the fixed tab bar
            (≈ 56px including safe-area). On lg+ the desktop sidebar
            sits inline so no bottom padding is needed. */}
        <div className="flex w-full pt-[58px] pb-[64px] lg:pb-0 h-full overflow-hidden">
          {/* Sidebar */}
          <BioEditorSidebar
            galleryId={page.id}
            activeThemeId={page.themeId}
            blocks={page.blocks}
            onSelectTheme={handleSelectTheme}
            onBlockSave={handleBlockSave}
          />

          {/* Canvas */}
          <div className="flex-1 bio-canvas-root themed overflow-hidden">
            <BioCanvas
              blocks={page.blocks}
              smLayout={page.smLayout}
              xxsLayout={page.xxsLayout}
              onLayoutChange={handleLayoutChange}
              onBlockAdd={handleBlockAdd}
              onBlockDelete={handleBlockDelete}
              isPublished={page.isPublished}
            />
          </div>
        </div>
      </div>
      {/* Share modal */}
      {showShareModal && (
        <BioShareModal
          url={`https://pivoturl.com/p/${page.slug}`}
          displayName={page.displayName}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </BioEditProvider>
  );
}

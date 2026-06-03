"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveGridLayout } from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useBioEdit } from "@/contexts/BioEditContext";
import { BioBlockRenderer } from "@/components/bio/blocks/BioBlockRenderer";
import { Monitor, Smartphone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Use UUID v4 for new blocks so they line up with the Postgres `uuid`
// column type and can be preserved across saves (no ID drift).
function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Polyfill — RFC 4122 v4 in environments without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BioBlock {
  id: string;
  type: string;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  visible: boolean;
  sortOrder: number;
}

export interface BioLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  minW?: number;
  minH?: number;
}

function toLayoutItems(items: BioLayoutItem[]): LayoutItem[] {
  return items as unknown as LayoutItem[];
}

// Keep only the canonical fields RGL needs and produce a stable JSON
// signature so we can bail out of `onLayoutChange` when nothing actually
// moved. RGL adds internal fields like `moved: false` after every
// synchronize/compact pass; without this guard we'd ping-pong forever.
type CanonicalItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

function canonicalize(items: readonly { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }[]): CanonicalItem[] {
  return [...items]
    .map((it) => ({ i: it.i, x: it.x, y: it.y, w: it.w, h: it.h, minW: it.minW, minH: it.minH }))
    .sort((a, b) => a.i.localeCompare(b.i));
}

function layoutSignature(items: readonly { i: string; x: number; y: number; w: number; h: number }[]): string {
  return JSON.stringify(canonicalize(items));
}

// ─── Default configs for each block type ─────────────────────────────────────
// Each new block lands on the canvas pre-filled with showcase content so
// the user immediately sees what the block does and can edit from a working
// example instead of an empty shell.

const BLOCK_DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  header: {
    title: "Your Name",
    description: "A short tagline about who you are or what you do.",
    avatar: { src: "" },
    alignment: "left",
  },
  "link-box": {
    title: "Visit my website",
    label: "yourdomain.com",
    link: "https://example.com",
    icon: { src: "https://cdn.simpleicons.org/safari/3B82F6" },
    showPreview: false,
  },
  "link-bar": {
    links: [
      { link: "https://x.com/", icon: { src: "https://cdn.simpleicons.org/x/000000" }, label: "X" },
      { link: "https://instagram.com/", icon: { src: "https://cdn.simpleicons.org/instagram/E4405F" }, label: "Instagram" },
      { link: "https://github.com/", icon: { src: "https://cdn.simpleicons.org/github/181717" }, label: "GitHub" },
      { link: "https://linkedin.com/", icon: { src: "https://cdn.simpleicons.org/linkedin/0A66C2" }, label: "LinkedIn" },
    ],
  },
  links: {
    title: "My links",
    subtitle: "Pinned things I share most",
    items: [
      {
        id: "demo-website",
        title: "My website",
        subtitle: "yourdomain.com",
        url: "https://example.com",
        iconUrl: "https://cdn.simpleicons.org/safari/3B82F6",
        visible: true,
      },
      {
        id: "demo-github",
        title: "GitHub",
        subtitle: "github.com/you",
        url: "https://github.com/",
        iconUrl: "https://cdn.simpleicons.org/github/181717",
        visible: true,
      },
      {
        id: "demo-x",
        title: "X / Twitter",
        subtitle: "@you",
        url: "https://x.com/",
        iconUrl: "https://cdn.simpleicons.org/x/000000",
        visible: true,
      },
    ],
  },
  content: {
    title: "About me",
    content:
      "Tell visitors a bit about yourself, your work, or what they'll find on this page. Click to edit and replace this with your own story.",
    alignment: "left",
  },
  image: {
    src: "",
    alt: "Image",
    caption: "Add a caption to give context to the image.",
    borderRadius: "md",
  },
  stack: {
    title: "Built With",
    label: "Tools and tech I use every day",
    items: [
      { title: "Next.js", label: "React framework", link: "https://nextjs.org", icon: { src: "https://cdn.simpleicons.org/nextdotjs/000000" } },
      { title: "TypeScript", label: "Typed JavaScript", link: "https://typescriptlang.org", icon: { src: "https://cdn.simpleicons.org/typescript/3178C6" } },
      { title: "Tailwind CSS", label: "Utility-first CSS", link: "https://tailwindcss.com", icon: { src: "https://cdn.simpleicons.org/tailwindcss/06B6D4" } },
    ],
  },
  // dQw4w9WgXcQ is the most-watched YouTube link of all time and a safe
  // sample to ship without licensing concerns.
  youtube: { videoId: "dQw4w9WgXcQ" },
  "spotify-embed": {
    embedUrl: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
    type: "track",
  },
  "spotify-playing-now": {},
  map: {
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 13,
    markerTitle: "New York City",
  },
  reaction: {},
  "waitlist-email": {
    title: "Join the waitlist",
    label: "Be the first to hear when we launch — no spam, ever.",
    buttonLabel: "Notify me",
    successTitle: "You're on the list! 🎉",
    successLabel: "We'll be in touch soon.",
    placeholder: "you@example.com",
    mode: "internal",
    waitlistId: "",
    variant: "card",
    accentColor: "#6366F1",
    confetti: true,
  },
  "github-commits-this-month": {
    githubUsername: "torvalds",
    metric: "commits-month",
    showDelta: true,
    variant: "default",
    accentColor: "#0F172A",
  },
  "instagram-latest-post": { numberOfPosts: 1 },
  "instagram-follower-count": {},
  "threads-follower-count": {},
  "tiktok-latest-post": {},
  "tiktok-follower-count": {},
};

function getDefaultConfig(type: string): Record<string, unknown> {
  return BLOCK_DEFAULT_CONFIGS[type] ?? {};
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyCanvas({ isDragOver }: { isDragOver: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[280px] sm:min-h-[400px] text-center px-6 sm:px-8 rounded-2xl border-2 border-dashed transition-all duration-200 mx-2 sm:mx-4 mt-4 sm:mt-6",
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-stone-200 bg-stone-50/50"
      )}
    >
      <div className={cn(
        "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 transition-colors",
        isDragOver ? "bg-primary/10" : "bg-stone-100"
      )}>
        <Plus className={cn("w-7 h-7 sm:w-8 sm:h-8 transition-colors", isDragOver ? "text-primary" : "text-stone-300")} />
      </div>
      <p className="text-sm font-medium text-stone-600 mb-1">
        {isDragOver ? "Drop to add block" : "Your canvas is empty"}
      </p>
      <p className="text-xs text-stone-400 max-w-[260px]">
        {isDragOver
          ? "Release to place the block here"
          : (
            <>
              <span className="hidden sm:inline">Drag a block from the sidebar, or tap one to add it.</span>
              <span className="sm:hidden">Open Blocks below and tap any block to add it.</span>
            </>
          )}
      </p>
    </div>
  );
}

// ─── BioCanvas ────────────────────────────────────────────────────────────────

interface BioCanvasProps {
  blocks: BioBlock[];
  smLayout: BioLayoutItem[];
  xxsLayout: BioLayoutItem[];
  onLayoutChange: (sm: BioLayoutItem[], xxs: BioLayoutItem[]) => void;
  onBlockAdd: (type: string, layout: BioLayoutItem, defaultConfig: Record<string, unknown>) => void;
  onBlockDelete: (blockId: string) => void;
  isPublished: boolean;
}

export function BioCanvas({
  blocks,
  smLayout,
  xxsLayout,
  onLayoutChange,
  onBlockAdd,
  onBlockDelete,
  isPublished,
}: BioCanvasProps) {
  const {
    draggingItem,
    setDraggingItem,
    nextToAddBlock,
    setNextToAddBlock,
    editLayoutMode,
    setEditLayoutMode,
    hoveredBlockId,
    setHoveredBlockId,
  } = useBioEdit();

  // Canvas-width tracking for ResponsiveGridLayout.
  //
  // We swap between two physical DOM elements when the user toggles
  // Desktop / Mobile preview (the desktop wrapper vs the mobile phone
  // screen). A static `useRef` would only observe the element that
  // mounted first — when the other one mounts on toggle, the observer
  // keeps watching the unmounted node and `canvasWidth` goes stale,
  // making blocks render at the wrong size for the new container.
  //
  // The callback-ref pattern below tears down the observer on the old
  // node and rebinds to the new one whenever React swaps refs.
  const [canvasWidth, setCanvasWidth] = useState(760);
  const [isDragOver, setIsDragOver] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  const canvasRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    // Seed immediately so RGL gets the right width on its first render
    // after a toggle, instead of waiting for the next frame's RO tick.
    const initialWidth = node.getBoundingClientRect().width;
    if (initialWidth > 0) setCanvasWidth(initialWidth);

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasWidth(w);
    });
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const isDesktop = editLayoutMode === "desktop";
  // Always declare BOTH breakpoints so RGL's responsive logic doesn't
  // complain about missing cols. We pin the active breakpoint with the
  // `breakpoint` prop below — RGL won't auto-switch based on width.
  const breakpoints = { sm: 480, xxs: 0 };
  const cols = { sm: 12, xxs: 4 };
  const activeLayout = isDesktop ? smLayout : xxsLayout;
  const breakpointKey: "sm" | "xxs" = isDesktop ? "sm" : "xxs";

  // ─── Handle mobile tap-to-add ─────────────────────────────────────────────
  useEffect(() => {
    if (!nextToAddBlock) return;
    const newId = makeId();
    // Place tap-to-add blocks at the bottom of the active layout.
    const bottomY = activeLayout.reduce(
      (max, l) => Math.max(max, l.y + l.h),
      0
    );
    const colCount = isDesktop ? 12 : 4;
    const w = Math.min(nextToAddBlock.w, colCount);
    const newItem: BioLayoutItem = {
      i: newId,
      x: 0,
      y: bottomY,
      w,
      h: nextToAddBlock.h,
      minW: 4,
      minH: 2,
    };
    onBlockAdd(nextToAddBlock.type, newItem, getDefaultConfig(nextToAddBlock.type));
    setNextToAddBlock(null);
    // We intentionally exclude activeLayout from deps — it changes after add.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextToAddBlock]);

  // ─── Drop handler ─────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (_layout: readonly LayoutItem[], item: LayoutItem | undefined) => {
      if (!draggingItem) return;
      const newId = makeId();
      const colCount = isDesktop ? 12 : 4;
      const w = Math.min(draggingItem.w, colCount);
      // RGL provides `item` with x/y when the drop is inside the grid;
      // when the canvas is empty/no overlap detected, fall back to bottom.
      const dropX = item?.x ?? 0;
      const dropY = item?.y ?? 0;
      const newItem: BioLayoutItem = {
        i: newId,
        x: Math.max(0, Math.min(dropX, colCount - w)),
        y: dropY,
        w,
        h: draggingItem.h,
        minW: 4,
        minH: 2,
      };
      onBlockAdd(draggingItem.type, newItem, getDefaultConfig(draggingItem.type));
      setDraggingItem(null);
      setIsDragOver(false);
    },
    [draggingItem, isDesktop, onBlockAdd, setDraggingItem]
  );

  // ─── Layout change ────────────────────────────────────────────────────────
  // We deliberately do NOT pipe `onLayoutChange` back into React state.
  // RGL emits this on every internal sync/compact tick and feeding those
  // emissions back as `propsLayout` causes an infinite loop in v2.
  //
  // Instead we sync only on user-action callbacks below: onDragStop,
  // onResizeStop, and onDrop. RGL owns its internal layout during
  // interaction; React state catches up on commit boundaries.
  const layoutsRef = useRef({ sm: smLayout, xxs: xxsLayout, isDesktop });
  layoutsRef.current = { sm: smLayout, xxs: xxsLayout, isDesktop };

  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;

  // Sync helper — fired from drag/resize stop with the post-action layout.
  const commitLayout = useCallback((finalLayout: readonly LayoutItem[]) => {
    const { sm, xxs, isDesktop: desk } = layoutsRef.current;
    const cleaned = canonicalize(finalLayout as unknown as BioLayoutItem[]) as unknown as BioLayoutItem[];
    const current = desk ? sm : xxs;
    if (layoutSignature(cleaned) === layoutSignature(current)) return;
    if (desk) {
      onLayoutChangeRef.current(cleaned, xxs);
    } else {
      onLayoutChangeRef.current(sm, cleaned);
    }
  }, []);

  const handleDragStop = useCallback(
    (finalLayout: readonly LayoutItem[]) => commitLayout(finalLayout),
    [commitLayout]
  );

  const handleResizeStop = useCallback(
    (finalLayout: readonly LayoutItem[]) => commitLayout(finalLayout),
    [commitLayout]
  );

  // Stable `layouts` prop so RGL doesn't see prop changes on every render.
  // `useMemo` keys off the canonical signatures of both layouts — same
  // positions ⇒ same array identity ⇒ no derivedLayout sync. We always
  // pass BOTH breakpoint layouts so RGL can resolve either side without
  // having to synthesize one.
  const smSig = layoutSignature(smLayout);
  const xxsSig = layoutSignature(xxsLayout);
  const layoutsProp = useMemo(
    () => ({
      sm: toLayoutItems(canonicalize(smLayout) as unknown as BioLayoutItem[]),
      xxs: toLayoutItems(canonicalize(xxsLayout) as unknown as BioLayoutItem[]),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [smSig, xxsSig]
  );

  // Render every block (including hidden ones) so RGL keeps their layout
  // entries alive. Hidden blocks are visually concealed and pointer-disabled
  // via class but stay in the grid so positions persist across visibility
  // toggles.
  const visibleBlockCount = blocks.filter((b) => b.visible).length;

  return (
    <div className="flex flex-col h-full bg-sys-bg-base overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
          <button
            type="button"
            onClick={() => setEditLayoutMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation",
              isDesktop
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
            aria-pressed={isDesktop}
            aria-label="Desktop preview"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setEditLayoutMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation",
              !isDesktop
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
            aria-pressed={!isDesktop}
            aria-label="Mobile preview"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-stone-400"}`} />
          <span className="text-xs text-stone-500">{isPublished ? "Live" : "Draft"}</span>
        </div>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onDragOver={(e) => {
          // Always preventDefault so the drop event fires inside RGL's
          // child handler (RGL listens at the .react-grid-layout node).
          e.preventDefault();
          if (draggingItem) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          // Only clear if leaving the canvas entirely
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
          }
        }}
        onDrop={() => setIsDragOver(false)}
      >
        {/* Mobile preview wrapper — when the user toggles to "Mobile",
            we frame the canvas in a phone shell (notch, dark bezel,
            rounded corners) so they're previewing the bio as it would
            look on an actual handset, not just a narrow column. The
            frame is purely decorative — drag-and-drop and the grid
            layout chain go through the same canvasRef + grid below. */}
        {!isDesktop ? (
          <div className="flex justify-center py-6 sm:py-10 px-3">
            <div
              className="relative bg-stone-900 rounded-[2.5rem] p-2 shadow-xl"
              style={{
                // Subtle inner bezel for depth — gradient sits on top of
                // the dark surround. Acts as the "phone body" colour.
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.08), 0 12px 32px -8px rgba(0,0,0,0.35)",
              }}
            >
              {/* Speaker / camera notch — purely decorative */}
              <div
                className="absolute left-1/2 top-2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-stone-900"
                aria-hidden
              >
                <span className="w-1 h-1 rounded-full bg-stone-700" />
                <span className="block w-10 h-1 rounded-full bg-stone-800" />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
              </div>

              {/* Inner screen — this is what the canvas-width
                  ResizeObserver measures. Rounded corners simulate the
                  display edge. The grid sits inside. */}
              <div
                ref={canvasRef}
                className="relative w-[340px] max-w-[80vw] rounded-[2rem] overflow-hidden bg-sys-bg-base"
                style={{ minHeight: 600 }}
              >
                {/* Top status-bar spacer accounts for the notch so block
                    content doesn't slide underneath it. */}
                <div className="h-7" aria-hidden />

                <div className="px-3 pb-6">
                  {/* Drop hint shown above the grid while dragging */}
                  {isDragOver && draggingItem && visibleBlockCount > 0 && (
                    <div className="mx-1 mb-3 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                  )}

                  <div className="relative">
                    {visibleBlockCount === 0 && (
                      <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-2 z-0">
                        <EmptyCanvas isDragOver={isDragOver && !!draggingItem} />
                      </div>
                    )}

                    <ResponsiveGridLayout
                      width={canvasWidth - 24}
                      breakpoint={breakpointKey}
                      layouts={layoutsProp}
                      breakpoints={breakpoints}
                      cols={cols}
                      rowHeight={60}
                      margin={[10, 10]}
                      containerPadding={[0, 0]}
                      dragConfig={{ enabled: true, bounded: false }}
                      resizeConfig={{ enabled: true, handles: ["se"] }}
                      dropConfig={{
                        enabled: true,
                        defaultItem: draggingItem
                          ? { w: draggingItem.w, h: draggingItem.h }
                          : { w: 12, h: 2 },
                      }}
                      onDragStop={handleDragStop as any}
                      onResizeStop={handleResizeStop as any}
                      onDrop={handleDrop as any}
                      droppingItem={
                        draggingItem
                          ? ({ i: draggingItem.i, x: 0, y: 0, w: draggingItem.w, h: draggingItem.h } as LayoutItem)
                          : undefined
                      }
                      style={{
                        minHeight: visibleBlockCount === 0 ? 420 : undefined,
                      }}
                      className="relative z-10"
                    >
                      {blocks.map((block) => {
                        const isHovered = hoveredBlockId === block.id;
                        return (
                          <div
                            key={block.id}
                            className={cn(
                              "group rounded-3xl transition-shadow",
                              !block.visible && "opacity-30 pointer-events-none",
                              isHovered &&
                                "ring-2 ring-primary ring-offset-2 ring-offset-transparent"
                            )}
                            aria-hidden={!block.visible}
                            onMouseEnter={() => setHoveredBlockId(block.id)}
                            onMouseLeave={() => {
                              if (hoveredBlockId === block.id) setHoveredBlockId(null);
                            }}
                          >
                            <BioBlockRenderer
                              block={block}
                              isEditable
                              onDelete={onBlockDelete}
                            />
                          </div>
                        );
                      })}
                    </ResponsiveGridLayout>
                  </div>
                </div>
              </div>

              {/* Home indicator — bottom pill */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-1.5 w-24 h-1 rounded-full bg-stone-700"
                aria-hidden
              />
            </div>
          </div>
        ) : (
          /* Desktop preview — full-width canvas, no frame. */
          <div
            ref={canvasRef}
            className="mx-auto py-4 sm:py-6 w-full px-3 sm:px-6"
          >
            {/* Drop hint shown above the grid while dragging */}
            {isDragOver && draggingItem && visibleBlockCount > 0 && (
              <div className="mx-4 mb-3 h-1.5 rounded-full bg-primary/40 animate-pulse" />
            )}

            <div className="px-3 sm:px-4">
              <div className="relative">
                {visibleBlockCount === 0 && (
                  <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-2 z-0">
                    <EmptyCanvas isDragOver={isDragOver && !!draggingItem} />
                  </div>
                )}

                <ResponsiveGridLayout
                  width={canvasWidth - 32}
                  breakpoint={breakpointKey}
                  layouts={layoutsProp}
                  breakpoints={breakpoints}
                  cols={cols}
                  rowHeight={60}
                  margin={[10, 10]}
                  containerPadding={[0, 0]}
                  dragConfig={{ enabled: true, bounded: false }}
                  resizeConfig={{ enabled: true, handles: ["se"] }}
                  dropConfig={{
                    enabled: true,
                    defaultItem: draggingItem
                      ? { w: draggingItem.w, h: draggingItem.h }
                      : { w: 12, h: 2 },
                  }}
                  onDragStop={handleDragStop as any}
                  onResizeStop={handleResizeStop as any}
                  onDrop={handleDrop as any}
                  droppingItem={
                    draggingItem
                      ? ({ i: draggingItem.i, x: 0, y: 0, w: draggingItem.w, h: draggingItem.h } as LayoutItem)
                      : undefined
                  }
                  style={{
                    minHeight: visibleBlockCount === 0 ? 420 : undefined,
                  }}
                  className="relative z-10"
                >
                  {blocks.map((block) => {
                    const isHovered = hoveredBlockId === block.id;
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          "group rounded-3xl transition-shadow",
                          !block.visible && "opacity-30 pointer-events-none",
                          isHovered &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-transparent"
                        )}
                        aria-hidden={!block.visible}
                        onMouseEnter={() => setHoveredBlockId(block.id)}
                        onMouseLeave={() => {
                          if (hoveredBlockId === block.id) setHoveredBlockId(null);
                        }}
                      >
                        <BioBlockRenderer
                          block={block}
                          isEditable
                          onDelete={onBlockDelete}
                        />
                      </div>
                    );
                  })}
                </ResponsiveGridLayout>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

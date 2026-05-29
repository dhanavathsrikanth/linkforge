"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Palette,
  X,
  Settings2,
  BarChart3,
} from "lucide-react";
import { useBioEdit, type BioSidebarView } from "@/contexts/BioEditContext";
import { SidebarBlocks } from "@/components/bio/sidebar/SidebarBlocks";
import { SidebarThemes } from "@/components/bio/sidebar/SidebarThemes";
import { SidebarBlockForm } from "@/components/bio/sidebar/SidebarBlockForm";
import type { BioBlock } from "@/components/bio/BioCanvas";

// ─── Nav items ────────────────────────────────────────────────────────────────
//
// Editor-only views. Settings and Analytics are reachable via the
// nav links at the bottom of the sidebar rail.

const NAV_ITEMS: {
  view: BioSidebarView;
  icon: React.ElementType;
  label: string;
}[] = [
  { view: "blocks", icon: LayoutGrid, label: "Blocks" },
  { view: "themes", icon: Palette,    label: "Themes" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface BioEditorSidebarProps {
  galleryId: string;
  activeThemeId?: string | null;
  /** When omitted the sidebar renders in nav-only mode (no Blocks/Themes panels). */
  blocks?: BioBlock[];
  onSelectTheme?: (themeId: string) => void;
  onBlockSave?: (blockId: string, config: Record<string, unknown>) => void;
}

// ─── BioEditorSidebar ─────────────────────────────────────────────────────────
//
// Two layouts:
//
// • lg+ (≥ 1024px) — classic split rail:
//     [150px label rail] [280px content panel]
//
// • mobile / tablet — bottom sheet pattern:
//     A fixed bottom tab bar shows the 2 view icons + labels. Tapping
//     a tab opens a slide-up sheet that contains the same content
//     panel. Tapping the same tab again, the X, or the overlay
//     closes it.

export function BioEditorSidebar({
  galleryId,
  activeThemeId,
  blocks = [],
  onSelectTheme,
  onBlockSave,
}: BioEditorSidebarProps) {
  // `navOnly` is true when the sidebar is rendered on settings/analytics
  // pages — no block state is available, so we skip the Blocks/Themes
  // panels and only show the nav links.
  const navOnly = !onSelectTheme || !onBlockSave;

  const { sidebarView, setSidebarView, sidebarOpen, setSidebarOpen, currentEditingBlock } = useBioEdit();
  const pathname = usePathname();

  const currentBlockConfig = currentEditingBlock
    ? (blocks.find((b) => b.id === currentEditingBlock.id)?.config ?? {})
    : {};

  function handleNavClick(view: BioSidebarView) {
    if (navOnly) return; // nav-only mode: panel tabs are disabled
    if (sidebarView === view && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setSidebarView(view);
      setSidebarOpen(true);
    }
  }

  // Lock body scroll when the mobile sheet is open so the canvas
  // underneath doesn't move while the user scrolls inside the sheet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile && sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sidebarOpen]);

  // ── Shared content body (used by both desktop panel + mobile sheet) ────
  const content = navOnly ? null : (
    <>
      {sidebarView === "blocks" && <SidebarBlocks />}
      {sidebarView === "blockForm" && (
        <SidebarBlockForm
          blockConfig={currentBlockConfig}
          galleryId={galleryId}
          onSave={onBlockSave!}
        />
      )}
      {sidebarView === "themes" && (
        <SidebarThemes
          activeThemeId={activeThemeId}
          onSelectTheme={onSelectTheme!}
        />
      )}
    </>
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP LAYOUT — hidden on mobile/tablet
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex h-full shrink-0">
        {/* Label rail */}
        <div className="w-[150px] shrink-0 flex flex-col py-3 gap-1 px-2 bg-white border-r border-stone-200 z-10">
          {/* Blocks / Themes tabs — hidden in nav-only mode */}
          {!navOnly && NAV_ITEMS.map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              type="button"
              onClick={() => handleNavClick(view)}
              className={cn(
                "flex items-center gap-2 px-2.5 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer",
                sidebarView === view && sidebarOpen
                  ? "bg-primary/10 text-primary"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}

          {/* Divider + bottom nav links — navigate to standalone pages */}
          <div className={cn("pt-2 border-t border-stone-100 flex flex-col gap-1", !navOnly && "mt-auto")}>
            <Link
              href={`/dashboard/bio/${galleryId}/analytics`}
              className={cn(
                "flex items-center gap-2 px-2.5 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer",
                pathname.includes("/analytics")
                  ? "bg-primary/10 text-primary"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              )}
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="truncate">Analytics</span>
            </Link>
            <Link
              href={`/dashboard/bio/${galleryId}/settings`}
              className={cn(
                "flex items-center gap-2 px-2.5 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer",
                pathname.includes("/settings")
                  ? "bg-primary/10 text-primary"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              )}
              title="Settings"
            >
              <Settings2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Settings</span>
            </Link>
          </div>
        </div>

        {/* Content panel — hidden in nav-only mode */}
        {!navOnly && (
          <div
            className={cn(
              "bg-stone-50 border-r border-stone-200 overflow-hidden transition-all duration-200",
              sidebarOpen ? "w-[280px]" : "w-0"
            )}
          >
            <div className="w-[280px] h-full overflow-hidden">{content}</div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE LAYOUT — visible below lg
          ───────────────────────────────────────────────────────────── */}

      {/* Bottom tab bar (always visible, sits over the canvas) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        aria-label="Editor sections"
      >
        <div className="grid grid-cols-4 gap-0.5">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
            const active = sidebarView === view && sidebarOpen;
            return (
              <button
                key={view}
                type="button"
                onClick={() => handleNavClick(view)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer touch-manipulation",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-stone-500 hover:bg-stone-50"
                )}
                aria-pressed={active}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-full">{label}</span>
              </button>
            );
          })}
          <Link
            href={`/dashboard/bio/${galleryId}/analytics`}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium text-stone-500 hover:bg-stone-50 transition-colors touch-manipulation"
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Analytics</span>
          </Link>
          <Link
            href={`/dashboard/bio/${galleryId}/settings`}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium text-stone-500 hover:bg-stone-50 transition-colors touch-manipulation"
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Bottom sheet — opens above the tab bar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Overlay — taps dismiss the sheet */}
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default animate-in fade-in duration-150"
          />

          {/* Sheet — slides up from the bottom, capped at 80vh so the
              top of the canvas peeks through and gives users orientation. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${sidebarView} panel`}
            className="absolute left-0 right-0 bottom-0 max-h-[80vh] bg-stone-50 rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200"
          >
            {/* Drag affordance + close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <div className="w-10" aria-hidden />
              <span className="h-1 w-10 rounded-full bg-stone-300" aria-hidden />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close panel"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content — own scroll area */}
            <div className="flex-1 overflow-hidden">{content}</div>
          </div>
        </div>
      )}
    </>
  );
}

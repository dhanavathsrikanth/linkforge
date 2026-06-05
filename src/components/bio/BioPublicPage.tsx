"use client";

import { useEffect, useState } from "react";
import { Responsive as ResponsiveGridLayout } from "react-grid-layout";
import type { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { BioBlockRenderer } from "@/components/bio/blocks/BioBlockRenderer";
import { BioShareBar } from "@/components/bio/BioShareBar";
import type { BioBlock, BioLayoutItem } from "@/components/bio/BioCanvas";

// ─── Visitor ID ───────────────────────────────────────────────────────────────
// Anonymous random ID used for analytics rate limiting (per-browser dedup).
// Stored in localStorage + cookie. No PII. Used only for frequency capping.

function getOrCreateVisitorId(): string {
  const KEY = "_bvid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function setVisitorCookie(id: string) {
  document.cookie = `_bvid=${id}; path=/; max-age=31536000; samesite=lax`;
}

function useVisitorId() {
  useEffect(() => {
    try {
      const id = getOrCreateVisitorId();
      setVisitorCookie(id);
    } catch {
      // localStorage unavailable (private browsing restrictions, etc.)
    }
  }, []);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BioPublicPageData {
  id: string;
  slug: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarInitials: string | null;
  avatarBgColor: string;
  showBranding: boolean;
  blocks: BioBlock[];
  smLayout: BioLayoutItem[];
  xxsLayout: BioLayoutItem[];
}

// ─── Profile header ───────────────────────────────────────────────────────────

function ProfileHeader({
  displayName,
  bio,
  avatarUrl,
  avatarInitials,
  avatarBgColor,
}: {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarInitials: string | null;
  avatarBgColor: string;
}) {
  const initials = avatarInitials ?? (displayName?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <div className="flex flex-col items-center text-center gap-3 mb-8">
      {/* Avatar */}
      <div className="relative">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName ?? "Profile"}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-white/20"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white/20"
            style={{ backgroundColor: avatarBgColor }}
          >
            {initials}
          </div>
        )}
        {/* No hardcoded online indicator — status is not tracked */}
      </div>

      {/* Name */}
      {displayName && (
        <h1
          className="text-xl font-bold leading-tight"
          style={{ color: "hsl(var(--sys-title-primary))" }}
        >
          {displayName}
        </h1>
      )}

      {/* Bio */}
      {bio && (
        <p
          className="text-sm leading-relaxed max-w-xs"
          style={{ color: "hsl(var(--sys-label-secondary))" }}
        >
          {bio}
        </p>
      )}
    </div>
  );
}

// ─── BioPublicPage ────────────────────────────────────────────────────────────

interface BioPublicPageProps {
  page: BioPublicPageData;
}

export function BioPublicPage({ page }: BioPublicPageProps) {
  useVisitorId();

  const [appBase, setAppBase] = useState(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://pivoturl.com"
  );
  useEffect(() => {
    setAppBase(window.location.origin.replace(/\/$/, ""));
  }, []);

  const visibleBlocks = page.blocks.filter((b) => b.visible);
  const hasProfile = page.displayName || page.bio || page.avatarUrl;

  return (
    <div
      className="bio-page-root min-h-screen"
      style={{ backgroundColor: "hsl(var(--sys-bg-base))" }}
    >
      <div className="max-w-[624px] mx-auto px-4 py-12">
        {/* ── Profile header ────────────────────────────────────────── */}
        {hasProfile && (
          <ProfileHeader
            displayName={page.displayName}
            bio={page.bio}
            avatarUrl={page.avatarUrl}
            avatarInitials={page.avatarInitials}
            avatarBgColor={page.avatarBgColor}
          />
        )}

        {/* ── Responsive grid of blocks ─────────────────────────────── */}
        {visibleBlocks.length > 0 && (
          <PublicGrid
            blocks={visibleBlocks}
            smLayout={page.smLayout}
            xxsLayout={page.xxsLayout}
          />
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {visibleBlocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p
              className="text-sm"
              style={{ color: "hsl(var(--sys-label-secondary))" }}
            >
              Nothing here yet.
            </p>
          </div>
        )}

        {/* ── Share bar ─────────────────────────────────────────────── */}
        <BioShareBar
          url={`${appBase}/p/${page.slug}`}
          displayName={page.displayName}
        />

        {/* ── Branding footer ───────────────────────────────────────── */}
        {page.showBranding && (
          <div className="flex justify-center mt-10">
            <a
              href={`${appBase}?utm_source=bio&utm_medium=branding&utm_campaign=${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "hsl(var(--sys-label-primary))" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Made with PivotUrl
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Public grid (client-side, no edit controls) ─────────────────────────────

function PublicGrid({
  blocks,
  smLayout,
  xxsLayout,
}: {
  blocks: BioBlock[];
  smLayout: BioLayoutItem[];
  xxsLayout: BioLayoutItem[];
}) {
  // Container is max-w-[624px] with px-4 (16px each side), so content width is 592px.
  // Use the same breakpoints as the editor canvas so the public page matches the preview.
  const GRID_WIDTH = 592;

  return (
    <ResponsiveGridLayout
      width={GRID_WIDTH}
      layouts={{
        sm: smLayout as unknown as LayoutItem[],
        xxs: xxsLayout as unknown as LayoutItem[],
      }}
      breakpoints={{ sm: 480, xxs: 0 }}
      cols={{ sm: 12, xxs: 4 }}
      rowHeight={60}
      margin={[10, 10]}
      containerPadding={[0, 0]}
      dragConfig={{ enabled: false }}
      resizeConfig={{ enabled: false }}
      compactor={undefined}
    >
      {blocks.map((block) => (
        <div key={block.id}>
          <BioBlockRenderer
            block={block}
            isEditable={false}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}

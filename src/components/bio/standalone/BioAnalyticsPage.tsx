"use client";

import { SidebarAnalytics } from "@/components/bio/sidebar/SidebarAnalytics";

interface BioAnalyticsPageProps {
  galleryId: string;
  slug: string;
  displayName: string | null;
  isPublished: boolean;
}

/**
 * Standalone analytics page for a single bio.
 *
 * Wraps the existing `SidebarAnalytics` panel so we keep one source of
 * truth for the charts + lookups. The wrapper just adds a page header
 * and removes the cramped 280px width constraint.
 */
export function BioAnalyticsPage({
  galleryId,
  slug,
  displayName,
  isPublished,
}: BioAnalyticsPageProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
          {displayName || "Untitled page"}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Views, clicks, devices, and top blocks for{" "}
          <span className="font-mono">/p/{slug}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <SidebarAnalytics galleryId={galleryId} isPublished={isPublished} />
      </div>
    </div>
  );
}

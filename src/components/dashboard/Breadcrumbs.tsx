"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Path → human label map ──────────────────────────────────────────────────
//
// Every dashboard sub-route is registered here so segments turn into the
// right human-readable label. Anything not in the map falls back to a
// title-cased version of the URL segment.

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  bio: "Link in Bio",
  links: "Links",
  "link-checker": "Link Checker",
  "link-in-bio": "Link in Bio",
  qr: "QR Codes",
  analytics: "Analytics",
  insights: "Insights",
  domain: "Domains",
  billings: "Billing",
  settings: "Settings",
  developers: "Developers",
  "api-keys": "API Keys",
  webhooks: "Webhooks",
};

function humanize(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BreadcrumbsProps {
  /** Override the auto-generated trail. Each item gets a Link unless `href`
   *  is omitted, in which case it's rendered as the current page label. */
  items?: { label: string; href?: string }[];
  /** Additional class names for the wrapper. */
  className?: string;
}

/**
 * Renders a clickable trail derived from the current URL by default.
 *
 * Examples:
 *   /dashboard                           → Dashboard
 *   /dashboard/bio                       → Dashboard / Link in Bio
 *   /dashboard/analytics/insights        → Dashboard / Analytics / Insights
 *
 * The dashboard root always appears as a `LayoutDashboard` icon link, so
 * users on any sub-route can return home with one tap — useful on
 * mobile where the sidebar is hidden behind a FAB / bottom sheet.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-derive trail from URL when no override is supplied. We only
  // emit breadcrumbs for routes that begin at /dashboard.
  const segments = (items
    ? null
    : pathname.split("/").filter(Boolean)) as string[] | null;

  const trail = items ?? buildTrailFromSegments(segments ?? []);
  if (trail.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground min-w-0",
        className
      )}
    >
      <ol className="flex items-center gap-1 min-w-0">
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          const isFirst = i === 0;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {!isFirst && (
                <ChevronRight
                  className="w-3 h-3 text-muted-foreground/60 shrink-0"
                  aria-hidden
                />
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    "truncate",
                    isLast && "text-foreground font-medium"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isFirst ? (
                    <span className="inline-flex items-center gap-1">
                      <LayoutDashboard className="w-3 h-3 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate hover:text-foreground transition-colors"
                >
                  {isFirst ? (
                    <span className="inline-flex items-center gap-1">
                      <LayoutDashboard className="w-3 h-3 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function buildTrailFromSegments(
  segments: string[]
): { label: string; href?: string }[] {
  // Only build a trail for /dashboard paths. The first segment is `dashboard`.
  if (segments[0] !== "dashboard") return [];

  const items: { label: string; href?: string }[] = [];
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentPath += `/${seg}`;
    items.push({
      label: humanize(seg),
      // Last segment has no href so it renders as the active page.
      href: i === segments.length - 1 ? undefined : currentPath,
    });
  }
  return items;
}

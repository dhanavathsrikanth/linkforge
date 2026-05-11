import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely, resolving conflicts.
 * Usage: cn("px-4 py-2", isActive && "bg-violet-600", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with compact notation (e.g. 12500 → "12.5K")
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/**
 * Truncate a string to maxLength, appending "…" if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Strip protocol from a URL for display (https://example.com/p → example.com/p)
 */
export function prettyUrl(url: string): string {
  try {
    return new URL(url).host + new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Build a full short URL from a slug and optional domain.
 */
export function buildShortUrl(slug: string, domain?: string): string {
  const base = domain ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${slug}`;
}

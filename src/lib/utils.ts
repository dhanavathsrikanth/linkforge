import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAppUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function getDefaultDomain() {
  const url = getAppUrl();
  return url.replace(/^https?:\/\//, "");
}

export function getShortLinkBase() {
  return `${getDefaultDomain()}/s`;
}

/**
 * Resolve the short URL domain for a link.
 *
 * Links with a custom domain use `https://{customDomain}/{slug}` (no /s/ prefix).
 * Links without a custom domain use `https://{defaultDomain}/s/{slug}`.
 *
 * The `link` parameter may be any object that carries either:
 *  - `domain?: { domain: string }` (Drizzle relation from the `domains` table)
 *  - `customDomain?: string` (pre-resolved domain hostname string)
 */
export function resolveLinkDomain(
  link: { domain?: { domain: string } | null; customDomain?: string | null } | null | undefined,
): { domain: string; basePath: string } {
  const custom = link?.domain?.domain ?? link?.customDomain;
  if (custom) {
    return { domain: custom, basePath: custom };
  }
  return { domain: getDefaultDomain(), basePath: `${getDefaultDomain()}/s` };
}

/**
 * Build the full short URL for a link, respecting any custom domain.
 */
export function getShortUrl(
  slug: string,
  link?: { domain?: { domain: string } | null; customDomain?: string | null } | null,
): string {
  const { basePath } = resolveLinkDomain(link);
  return `https://${basePath}/${slug}`;
}

/**
 * The permanent domain used for scannable QR codes and shareable short URLs.
 *
 * QR codes are printed on materials and must outlast any preview deployment,
 * so they **must** encode the real production domain — never a Vercel preview
 * host like `pivoturl.vercel.app`.  When the QR targets the real domain, the
 * Cloudflare Worker intercepts the request and issues the 302 redirect
 * directly, bypassing Clerk auth entirely.  A preview deployment URL would
 * instead hit the Worker → Vercel proxy → Clerk auth → and fail with an
 * invalid `redirect_url` error.
 *
 * Priority:
 *  1. `NEXT_PUBLIC_MAIN_DOMAIN` env var (e.g. `pivoturl.com` — no protocol)
 *  2. `NEXT_PUBLIC_APP_URL` env var (strip protocol)
 *  3. Hard-coded `pivoturl.com`
 */
/**
 * Replace the host in a URL with the canonical production host.
 * This prevents Clerk redirect_url errors when the app runs on
 * a Vercel preview domain that isn't whitelisted in Clerk Dashboard.
 */
export function getProductionHost(): string {
  if (process.env.NEXT_PUBLIC_MAIN_DOMAIN) {
    return process.env.NEXT_PUBLIC_MAIN_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "pivoturl.com";
}

export function sanitizeRedirectUrl(url: string): string {
  const parsed = new URL(url);
  const prodHost = getProductionHost();
  if (parsed.host !== prodHost) {
    parsed.host = prodHost;
  }
  return parsed.toString();
}

export function getQrDomain(): string {
  if (process.env.NEXT_PUBLIC_MAIN_DOMAIN) {
    return process.env.NEXT_PUBLIC_MAIN_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "pivoturl.com";
}

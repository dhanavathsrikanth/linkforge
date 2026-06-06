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
export function getQrDomain(): string {
  if (process.env.NEXT_PUBLIC_MAIN_DOMAIN) {
    return process.env.NEXT_PUBLIC_MAIN_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "pivoturl.com";
}

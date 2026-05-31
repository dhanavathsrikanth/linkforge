/**
 * Reserved slugs/paths that may never be used as a short-link slug on a
 * custom domain, or as a bio page slug. Shared by the bio gallery API and
 * the link APIs (custom-domain-assignment spec, Requirement 9).
 *
 * Two categories:
 *  - Application/route words that would shadow app routes or look unsafe.
 *  - System file paths that browsers, crawlers, and protocols request at the
 *    root of any host. These are ALSO enforced at the edge (worker
 *    system-path passthrough, Requirement 5.6) so a bio domain never serves
 *    bio HTML for e.g. /favicon.ico.
 */

/** Application + route reserved words (exact match, case-insensitive). */
export const RESERVED_SLUGS = new Set<string>([
  "admin", "api", "p", "s", "dashboard", "login", "signup", "sign-in", "sign-up",
  "blog", "pricing", "about", "contact", "help", "support", "terms", "privacy",
  "404", "500", "me", "home", "www", "app", "bio", "links", "qr", "health",
]);

/** System files requested at a host root (exact match, case-insensitive). */
export const RESERVED_SYSTEM_FILES = new Set<string>([
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
]);

/** Path prefixes that are always reserved (e.g. ACME / app-association). */
export const RESERVED_PREFIXES = [".well-known/", ".well-known"];

/**
 * Returns true when `slug` (a single path segment, without a leading slash)
 * must not be used for a short link or bio. Case-insensitive.
 */
export function isReservedSlug(slug: string): boolean {
  if (!slug) return true;
  const s = slug.trim().toLowerCase().replace(/^\/+/, "");
  if (s === "") return true;
  if (RESERVED_SLUGS.has(s)) return true;
  if (RESERVED_SYSTEM_FILES.has(s)) return true;
  for (const prefix of RESERVED_PREFIXES) {
    if (s === prefix || s.startsWith(prefix)) return true;
  }
  return false;
}

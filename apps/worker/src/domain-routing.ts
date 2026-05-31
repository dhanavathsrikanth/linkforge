/**
 * Pure custom-domain routing resolver (custom-domain-assignment spec, Req 5).
 *
 * Given a domain's config and the request path, decide what the edge should
 * do — with a single deterministic precedence so behavior is predictable when
 * bios and short links share a host:
 *
 *   1. suspended            (status != active)         → block
 *   2. system-passthrough   (favicon/robots/.well-known/…) → origin
 *   3. root path "/":  root-bio → root-redirect → not-found
 *   4. non-root path:  link (if role allows) → not-found
 *
 * This function does NO I/O. The caller resolves the link's existence
 * downstream (KV / internal API) when the result is `{ kind: "link" }`.
 */

import type { DomainConfig } from './types';

export type RouteResult =
  | { kind: 'system-passthrough' }
  | { kind: 'suspended'; httpStatus: 503 | 410 }
  | { kind: 'root-bio'; galleryId: string; slug: string }
  | { kind: 'root-redirect'; url: string }
  | { kind: 'link'; slug: string }
  | { kind: 'not-found' };

/** System files browsers/crawlers request at a host root. */
const SYSTEM_FILES = new Set([
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
]);

/** Returns the first path segment (no leading slash, lowercased). */
export function firstSegment(path: string): string {
  return path.replace(/^\/+/, '').split('/')[0]?.toLowerCase() ?? '';
}

function isSystemPath(path: string): boolean {
  const seg = firstSegment(path);
  if (seg === '') return false;
  if (SYSTEM_FILES.has(seg)) return true;
  // `.well-known` and anything under it
  if (seg === '.well-known') return true;
  return false;
}

export function resolveRoute(cfg: DomainConfig, path: string): RouteResult {
  // 1. Suspension short-circuits everything.
  if (cfg.status !== 'active') {
    return {
      kind: 'suspended',
      httpStatus: cfg.status === 'suspended_abuse' ? 410 : 503,
    };
  }

  // 2. System paths pass through on every domain, regardless of role.
  if (isSystemPath(path)) {
    return { kind: 'system-passthrough' };
  }

  const seg = firstSegment(path);

  // 3. Root path.
  if (seg === '') {
    if (cfg.hasRootBio && cfg.rootBioId) {
      return { kind: 'root-bio', galleryId: cfg.rootBioId, slug: cfg.rootBioSlug ?? '' };
    }
    if (cfg.rootRedirectUrl) {
      return { kind: 'root-redirect', url: cfg.rootRedirectUrl };
    }
    return { kind: 'not-found' };
  }

  // 4. Non-root path → short link, when the role allows links.
  if (cfg.role === 'links' || cfg.role === 'both') {
    return { kind: 'link', slug: seg };
  }

  // role === 'bio' with a non-root path and no path-scoped bios (v1) → 404.
  return { kind: 'not-found' };
}

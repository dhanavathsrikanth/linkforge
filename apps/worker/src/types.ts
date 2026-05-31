// ─── Existing link redirect types ────────────────────────────────────────────

export interface Env {
  // ── Existing KV ──────────────────────────────────────────────────────────
  LINKS_KV: KVNamespace;

  // ── Bio page KV namespaces ────────────────────────────────────────────────
  /** HTML cache for published bio pages + domain→slug mapping + OG image cache */
  BIO_PAGES_KV: KVNamespace;
  /** Analytics event buffer — flushed hourly to Neon via /api/internal/bio-events */
  BIO_ANALYTICS_KV: KVNamespace;

  // ── Secrets / vars ────────────────────────────────────────────────────────
  /** Base URL of the Next.js app — e.g. https://pivoturl.com */
  API_URL: string;
  /** Shared secret between worker and Next.js internal endpoints */
  WORKER_SECRET: string;
}

// ─── Link redirect types (unchanged) ─────────────────────────────────────────

export interface Link {
  id: string;
  domain: string;
  slug: string;
  destination: string;
  isActive: boolean;
  password?: string;
  expiresAt?: string;
  totalClicks: number;
  expiresAfterClicks?: number;
  routingRules?: RoutingRule[];
  abTestEnabled?: boolean;
  abVariants?: ABVariant[];
}

export interface RoutingRule {
  condition: {
    device?: 'mobile' | 'desktop' | 'tablet';
    country?: string;
    language?: string;
  };
  destination: string;
}

export interface ABVariant {
  destination: string;
  weight: number;
  id: string;
}

export interface RequestContext {
  device: 'mobile' | 'desktop' | 'tablet' | 'bot';
  country: string;
  city: string;
  region: string;
  language: string;
  ipHash: string;
  isUnique: boolean;
}

export interface ClickData {
  linkId: string;
  device: string;
  browser?: string;
  os?: string;
  country: string;
  city: string;
  region: string;
  ipHash: string;
  isUnique: boolean;
  language: string;
  referrer?: string;
  variant?: string;
}

// ─── Bio page types ───────────────────────────────────────────────────────────

export interface BioPageEvent {
  /** ISO timestamp */
  ts: string;
  /** ISO 3166-1 alpha-2 country code from request.cf.country */
  country: string;
  city: string;
  region: string;
  /** Latitude from request.cf.latitude */
  lat?: string;
  /** Longitude from request.cf.longitude */
  lon?: string;
  device: 'mobile' | 'desktop' | 'tablet' | 'bot';
  browser?: string;
  os?: string;
  referrer?: string;
  /** SHA-256 of IP — for unique visitor dedup */
  ipHash: string;
  isUnique: boolean;
}

export interface BioDomainMapping {
  /** The bio page slug this custom domain maps to */
  slug: string;
  /** Gallery ID — passed to analytics */
  galleryId: string;
}

// ─── Custom-domain routing config (custom-domain-assignment spec) ─────────────

export type DomainRole = 'links' | 'bio' | 'both';
export type DomainStatus = 'active' | 'suspended_billing' | 'suspended_abuse';

/**
 * Routing config for a custom host, stored at KV key `domain:{host}` and
 * written by the Next.js control plane on bind/role/status changes.
 */
export interface DomainConfig {
  role: DomainRole;
  status: DomainStatus;
  workspaceId: string;
  /** True when a bio is bound to this domain's root ("/"). */
  hasRootBio: boolean;
  /** Gallery id of the root bio, when hasRootBio is true. */
  rootBioId?: string;
  /** Slug of the root bio (used by the bio HTML cache flow). */
  rootBioSlug?: string;
  /** For role=links domains: where the bare "/" 302s when no bio is bound. */
  rootRedirectUrl?: string;
}


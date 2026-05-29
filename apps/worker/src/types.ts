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

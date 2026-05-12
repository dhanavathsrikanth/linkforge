// Shared type definitions for the Cloudflare Worker

export type RoutingRule = {
  condition: {
    device?: "mobile" | "desktop" | "tablet";
    country?: string;   // ISO 3166-1 alpha-2, e.g. "US"
    language?: string;  // BCP 47 prefix, e.g. "fr", "en"
  };
  destination: string;
};

export type AbVariant = {
  destination: string;
  weight: number;
  name?: string;
  clicks?: number;
};

/** Shape returned by GET /api/internal/links */
export type LinkData = {
  id: string;
  slug: string;
  domain: string | null;          // resolved custom domain hostname or null
  destination: string;
  isActive: boolean;
  expiresAt: string | null;       // ISO 8601 or null
  expiresAfterClicks: number | null; // maps to clickLimit in DB schema
  totalClicks: number;
  password: string | null;        // bcrypt hash or null
  routingRules: RoutingRule[] | null;
  abTestEnabled: boolean;
  abVariants: AbVariant[] | null; // maps to abTestVariants in DB schema
  workspaceId: string;
};

export type RequestContext = {
  device: "mobile" | "desktop" | "tablet" | "bot" | "unknown";
  country: string;
  language: string;
};

export type Env = {
  LINKS_KV: KVNamespace;
  /** Base URL of the Next.js app, e.g. https://linkforge.app */
  API_URL: string;
  /** Shared secret sent as x-worker-secret header to internal APIs */
  WORKER_SECRET: string;
};

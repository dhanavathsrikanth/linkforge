export interface Env {
  LINKS_KV: KVNamespace;
  API_URL: string;
}

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

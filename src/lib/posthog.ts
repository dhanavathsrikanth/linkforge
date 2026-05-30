import { PostHog } from "posthog-node";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const serverPosthog =
  typeof window === "undefined" && token
    ? new PostHog(token, { host })
    : null;

export async function trackLinkCreated(params: {
  linkId: string;
  domain: string;
  hasCustomSlug: boolean;
  hasUTM: boolean;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({ distinctId: "server", event: "link_created", properties: params });
  await serverPosthog.shutdown();
}

export async function trackLinkClicked(params: {
  linkId: string;
  domain: string;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({ distinctId: "server", event: "link_clicked", properties: params });
  await serverPosthog.shutdown();
}

export async function trackQRDownloaded(params: {
  linkId: string;
  format: string;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({ distinctId: "server", event: "qr_downloaded", properties: params });
  await serverPosthog.shutdown();
}

export async function trackBioPageViewed(params: {
  galleryId: string;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({ distinctId: "server", event: "bio_page_viewed", properties: params });
  await serverPosthog.shutdown();
}

export async function trackUserUpgraded(params: {
  fromPlan: string;
  toPlan: string;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({ distinctId: "server", event: "user_upgraded", properties: params });
  await serverPosthog.shutdown();
}

// ─── Safety / URL Scanner events (Req 25) ────────────────────────────────────

export async function trackSafetyScanCompleted(params: {
  workspaceId: string;
  linkId: string;
  scanId: string;
  trustScore: number;
  trustBand: string;
  malicious: boolean;
  cacheHit: boolean;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({
    distinctId: params.workspaceId,
    event: "safety_scan_completed",
    properties: params,
  });
  await serverPosthog.shutdown();
}

export async function trackTrustApiCall(params: {
  workspaceId: string;
  apiKeyId: string;
  cacheHit: boolean;
  responseStatus: number;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({
    distinctId: params.workspaceId,
    event: "trust_api_call",
    properties: params,
  });
  await serverPosthog.shutdown();
}

export async function trackSafetyBandChange(params: {
  workspaceId: string;
  linkId: string;
  scanId: string;
  previousBand: string;
  nextBand: string;
  trustScore: number;
}) {
  if (!serverPosthog) return;
  serverPosthog.capture({
    distinctId: params.workspaceId,
    event: "safety_band_changed",
    properties: params,
  });
  await serverPosthog.shutdown();
}

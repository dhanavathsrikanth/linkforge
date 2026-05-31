/**
 * Builds the edge routing config for a custom host and pushes it to the
 * Cloudflare worker's `domain:{host}` KV key (custom-domain-assignment spec,
 * Req 5/8). The worker reads this on every request to a custom hostname.
 *
 * The Next.js app owns the database; the worker only reads KV. Both this
 * push (control plane) and the worker's cache-miss warming
 * (`/api/internal/domain-resolve`) derive the same shape from these helpers.
 */

import { db } from "@/lib/db";
import { domains, linkGallery } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type DomainRole = "links" | "bio" | "both";
export type DomainStatus = "active" | "suspended_billing" | "suspended_abuse";

export interface DomainConfig {
  role: DomainRole;
  status: DomainStatus;
  workspaceId: string;
  hasRootBio: boolean;
  rootBioId?: string;
  rootBioSlug?: string;
  rootRedirectUrl?: string;
}

/**
 * Resolve the routing config for a host from the database. Returns null when
 * the host is unknown or not verified (the worker then 404s / legacy-falls-back).
 */
export async function buildDomainConfig(host: string): Promise<DomainConfig | null> {
  const dom = await db.query.domains.findFirst({
    where: eq(domains.domain, host.toLowerCase()),
  });
  if (!dom || !dom.verified) return null;

  // The single bound bio (one-per-domain in v1) is the root bio.
  const bio = await db.query.linkGallery.findFirst({
    where: and(eq(linkGallery.customDomainId, dom.id), eq(linkGallery.isPublished, true)),
    columns: { id: true, slug: true },
  });

  return {
    role: dom.role as DomainRole,
    status: dom.status as DomainStatus,
    workspaceId: dom.workspaceId,
    hasRootBio: !!bio,
    rootBioId: bio?.id,
    rootBioSlug: bio?.slug,
    rootRedirectUrl: dom.rootRedirectUrl ?? undefined,
  };
}

/**
 * Push (or delete) the `domain:{host}` config to the worker KV. Best-effort:
 * callers that need confirmation should await and inspect the boolean.
 * Returns true on success, false on any failure (caller decides severity).
 */
export async function syncDomainConfig(
  host: string,
  config: DomainConfig | null,
  opts: { timeoutMs?: number } = {}
): Promise<boolean> {
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return true; // no worker configured (dev) → no-op success

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 2000);
  try {
    const res = await fetch(`${workerUrl}/internal/domain-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify(config === null ? { host, remove: true } : { host, config }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience: rebuild config from DB and push it. */
export async function refreshDomainConfig(host: string, opts?: { timeoutMs?: number }): Promise<boolean> {
  const cfg = await buildDomainConfig(host);
  return syncDomainConfig(host, cfg, opts);
}

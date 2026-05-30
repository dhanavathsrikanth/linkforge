import { db, links, scanReports, assetRiskFlags } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  submitUrlScan,
  getScanResult,
  getScanHar,
  summarizeHar,
  getScanDom,
  analyzeDom,
  type ScanResult,
} from "@/lib/cloudflare/url-scanner";
import {
  analyzeAssetRisks,
  type AssetRiskFlag,
} from "@/lib/cloudflare/asset-risk-analyzer";
import {
  computeTrustScore,
  inputsFromScanResult,
  TRUST_WEIGHT_VERSION,
  type TrustBand,
  type TrustScoreOutput,
} from "@/lib/cloudflare/trust-score";
import { tryReserveScan, releaseReservation } from "@/lib/cloudflare/scan-quota";
import { sendWebhookEvent } from "@/lib/svix/send";
import { redis } from "@/lib/redis";
import { findSimilarScans } from "@/lib/cloudflare/similarity-search";
import { safetyCapabilitiesForPlan } from "@/lib/cloudflare/safety-capabilities";
import { workspaces, scanScreenshots } from "@/lib/db/schema";
import { fetchScanScreenshot } from "@/lib/cloudflare/screenshot";
import {
  trackSafetyScanCompleted,
  trackSafetyBandChange,
} from "@/lib/posthog";
import { logAudit } from "@/lib/db/audit";

/**
 * Bridge between LinkForge's `links` rows and the Cloudflare URL Scanner.
 *
 * Pipeline invariants:
 *   - Every finished scan is persisted as a `scan_reports` row (Req 1.1, 1.3)
 *   - The same scan_id processed twice yields the same end state (Req 22.2)
 *   - Trust_Score is recomputed when weight version drifts (Req 2.10)
 *   - Band transitions fire webhook events with deduplication (Req 12)
 *
 * Public surface:
 *   - isUrlScannerConfigured()
 *   - startSafetyScan(linkId, destination)
 *   - refreshSafetyVerdict(linkId)
 *   - rescanLinkSafety(linkId, destination, reason?)
 */

export type SafetyStatus =
  | "unknown"
  | "pending"
  | "safe"
  | "suspicious"
  | "malicious"
  | "error";

export function isUrlScannerConfigured(): boolean {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_URL_SCANNER_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  return !!accountId && !!token;
}

// ─── Submission ──────────────────────────────────────────────────────────────

/**
 * Submit a destination URL to Cloudflare URL Scanner. Stamps `safety_status =
 * pending` and persists the scan ID on the link. Cost-controlled via Redis
 * quota counters; idempotent within a 5s window via Redis lock (Req 22.1).
 */
export async function startSafetyScan(
  linkId: string,
  destination: string,
  options?: { rescanReason?: string }
): Promise<{ submitted: boolean; scanId?: string; reason?: string }> {
  if (!isUrlScannerConfigured()) {
    return { submitted: false, reason: "scanner_not_configured" };
  }

  // Resolve workspace for quota
  const link = await db.query.links.findFirst({
    where: (l, { eq }) => eq(l.id, linkId),
    columns: { id: true, workspaceId: true },
  });
  if (!link) return { submitted: false, reason: "link_not_found" };

  // 5-second coalescing lock so back-to-back rescan clicks don't double-submit
  const lockKey = `urlscanner:lock:${linkId}`;
  let lockAcquired = false;
  try {
    const setRes = await redis.set(lockKey, "1", { nx: true, ex: 5 });
    lockAcquired = setRes === "OK" || setRes === true;
  } catch {
    lockAcquired = false;
  }
  if (!lockAcquired) {
    return { submitted: false, reason: "submit_in_flight" };
  }

  // Quota
  const quota = await tryReserveScan(link.workspaceId);
  if (!quota.allowed) {
    return { submitted: false, reason: `quota_exceeded:${quota.reason}` };
  }

  try {
    const submission = await submitUrlScan(destination, { visibility: "Unlisted" });

    // Update the link to pending
    await db
      .update(links)
      .set({
        safetyStatus: "pending",
        safetyScanId: submission.uuid,
        safetyScannedAt: new Date(),
      })
      .where(eq(links.id, linkId));

    // Persist a pending scan_reports row so the dashboard sees it
    await db
      .insert(scanReports)
      .values({
        linkId,
        workspaceId: link.workspaceId,
        scanId: submission.uuid,
        status: "pending",
        rescanReason: options?.rescanReason ?? null,
      })
      .onConflictDoNothing({ target: scanReports.scanId });

    return { submitted: true, scanId: submission.uuid };
  } catch (err) {
    console.warn("[startSafetyScan] failed for link", linkId, err);
    await releaseReservation(link.workspaceId);
    await db
      .update(links)
      .set({ safetyStatus: "error", safetyScannedAt: new Date() })
      .where(eq(links.id, linkId))
      .catch(() => {});
    return { submitted: false, reason: "submit_failed" };
  }
}

// ─── Verdict refresh ─────────────────────────────────────────────────────────

/**
 * Pull the latest verdict for a link's pending scan from Cloudflare and
 * persist a finished scan_reports row, asset risk flags, and the Trust
 * Score. Returns null when the scan is still in progress.
 *
 * This function is idempotent: replaying it on the same scanId yields the
 * same end state because we upsert by `scan_id` (Req 22.2).
 */
export async function refreshSafetyVerdict(
  linkId: string
): Promise<{ status: SafetyStatus; trustScore: number; trustBand: TrustBand } | null> {
  const link = await db.query.links.findFirst({
    where: (l, { eq }) => eq(l.id, linkId),
    columns: {
      id: true,
      workspaceId: true,
      safetyScanId: true,
      safetyTrustBand: true,
    },
  });
  if (!link?.safetyScanId) return null;

  const result = await getScanResult(link.safetyScanId);
  if (!result) {
    return null; // still in progress (Cloudflare returns 404)
  }

  if (result.status === "Failed" || !result.success) {
    await markFailed(linkId, link.workspaceId, link.safetyScanId, "scan_failed");
    return { status: "error", trustScore: 0, trustBand: "unknown" };
  }

  const { newStatus, trust, flags } = await persistFinishedReport(
    linkId,
    link.workspaceId,
    result
  );

  const previousBand = (link.safetyTrustBand as TrustBand) ?? "unknown";

  // ── Fire band-transition webhook (Req 12) ──────────────────────────────
  await maybeFireSafetyWebhook({
    workspaceId: link.workspaceId,
    linkId,
    scanId: result.uuid,
    previousBand,
    nextBand: trust.band,
    trustScore: trust.score,
    malicious: result.verdicts.overall.malicious,
  });

  // ── Audit + analytics for band transitions (Req 25.1, 25.3) ────────────
  if (previousBand !== trust.band) {
    await logAudit({
      workspaceId: link.workspaceId,
      actorId: null,
      action: "safety.band_change",
      entityType: "link",
      entityId: linkId,
      metadata: {
        previousBand,
        nextBand: trust.band,
        trustScore: trust.score,
        scanId: result.uuid,
      },
    }).catch(() => {});
    await trackSafetyBandChange({
      workspaceId: link.workspaceId,
      linkId,
      scanId: result.uuid,
      previousBand,
      nextBand: trust.band,
      trustScore: trust.score,
    }).catch(() => {});
  }

  // Always emit safety_scan_completed (Req 25.3)
  await trackSafetyScanCompleted({
    workspaceId: link.workspaceId,
    linkId,
    scanId: result.uuid,
    trustScore: trust.score,
    trustBand: trust.band,
    malicious: result.verdicts.overall.malicious,
    cacheHit: false,
  }).catch(() => {});

  return { status: newStatus, trustScore: trust.score, trustBand: trust.band };
}

// ─── Rescan ───────────────────────────────────────────────────────────────────

/**
 * Re-submit an existing link's destination for a fresh scan. Drops stale
 * scan ID + verdict so the dashboard immediately reflects "pending".
 */
export async function rescanLinkSafety(
  linkId: string,
  destination: string,
  reason: string = "manual"
): Promise<{ submitted: boolean; reason?: string; scanId?: string }> {
  await db
    .update(links)
    .set({
      safetyStatus: "pending",
      safetyScanId: null,
      safetyScannedAt: null,
      safetyVerdict: null,
    })
    .where(eq(links.id, linkId));

  return startSafetyScan(linkId, destination, { rescanReason: reason });
}

// ─── Bulk submission ──────────────────────────────────────────────────────────

/**
 * Submit up to 100 link destinations in a single Cloudflare bulk scan request.
 * More efficient than looping `startSafetyScan` — one HTTP call instead of N.
 *
 * Used by the rescan-due cron when it has a batch of candidates. Each link
 * gets its scan ID written back immediately after the bulk response lands.
 *
 * Quota is reserved once per batch (global ceiling) rather than per-link.
 * If the batch would exceed the workspace ceiling we fall back to individual
 * submissions so per-workspace accounting stays accurate.
 */
export async function startBulkSafetyScan(
  candidates: { linkId: string; destination: string; workspaceId: string }[],
  options?: { rescanReason?: string }
): Promise<{ submitted: number; failed: number; quotaBlocked: number }> {
  if (!isUrlScannerConfigured() || candidates.length === 0) {
    return { submitted: 0, failed: 0, quotaBlocked: candidates.length };
  }

  const { submitBulkUrlScan } = await import("@/lib/cloudflare/url-scanner");

  // Chunk into batches of 100 (API limit)
  const CHUNK = 100;
  let submitted = 0;
  let failed = 0;
  let quotaBlocked = 0;

  for (let i = 0; i < candidates.length; i += CHUNK) {
    const chunk = candidates.slice(i, i + CHUNK);

    // Check quota for the first workspace in the chunk (all same workspace
    // in the cron case). If blocked, mark the whole chunk as quota-blocked.
    const wsId = chunk[0].workspaceId;
    const quota = await tryReserveScan(wsId);
    if (!quota.allowed) {
      quotaBlocked += chunk.length;
      continue;
    }
    // Release the single reservation we just took — bulk counts as one
    // submission from the quota perspective but we'll re-reserve below
    // per-link for accurate per-workspace accounting.
    await releaseReservation(wsId);

    // Reserve one slot per link in the chunk
    const reserved: typeof chunk = [];
    for (const c of chunk) {
      const q = await tryReserveScan(c.workspaceId);
      if (!q.allowed) { quotaBlocked++; continue; }
      reserved.push(c);
    }
    if (reserved.length === 0) continue;

    // Mark all as pending before submitting so the dashboard reflects it
    await Promise.all(
      reserved.map((c) =>
        db.update(links).set({
          safetyStatus: "pending",
          safetyScannedAt: new Date(),
        }).where(eq(links.id, c.linkId))
      )
    );

    let results: Awaited<ReturnType<typeof submitBulkUrlScan>>;
    try {
      results = await submitBulkUrlScan(
        reserved.map((c) => ({
          url: c.destination,
          visibility: "Unlisted" as const,
        }))
      );
    } catch (err) {
      console.warn("[startBulkSafetyScan] bulk submit failed:", err);
      // Roll back quota reservations
      await Promise.all(reserved.map((c) => releaseReservation(c.workspaceId)));
      failed += reserved.length;
      continue;
    }

    // Write scan IDs back to each link and insert pending scan_reports rows
    for (let j = 0; j < reserved.length; j++) {
      const c = reserved[j];
      const r = results[j];
      if (!r?.uuid) { failed++; continue; }

      await db.update(links).set({ safetyScanId: r.uuid }).where(eq(links.id, c.linkId));
      await db.insert(scanReports).values({
        linkId: c.linkId,
        workspaceId: c.workspaceId,
        scanId: r.uuid,
        status: "pending",
        rescanReason: options?.rescanReason ?? null,
      }).onConflictDoNothing({ target: scanReports.scanId });

      submitted++;
    }
  }

  return { submitted, failed, quotaBlocked };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function markFailed(
  linkId: string,
  workspaceId: string,
  scanId: string,
  detail: string
): Promise<void> {
  await db
    .insert(scanReports)
    .values({
      linkId,
      workspaceId,
      scanId,
      status: "failed",
      fetchedAt: new Date(),
      validationError: detail,
    })
    .onConflictDoUpdate({
      target: scanReports.scanId,
      set: {
        status: "failed",
        fetchedAt: new Date(),
        validationError: detail,
        updatedAt: new Date(),
      },
    });

  await db
    .update(links)
    .set({ safetyStatus: "error", safetyScannedAt: new Date() })
    .where(eq(links.id, linkId));
}

async function persistFinishedReport(
  linkId: string,
  workspaceId: string,
  result: ScanResult
): Promise<{
  newStatus: SafetyStatus;
  trust: TrustScoreOutput;
  flags: AssetRiskFlag[];
}> {
  const flags = analyzeAssetRisks(result);
  const flagKinds = flags.map((f) => f.kind);

  // ── Similarity search (Req 8) ──────────────────────────────────────────
  // Fetch in parallel-friendly order. Penalty applied only when the
  // workspace plan permits it (Req 8.5).
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { plan: true },
  });
  const capabilities = safetyCapabilitiesForPlan(ws?.plan ?? "free");

  let similarToMalicious = false;
  let similarityPayload: { hash: string; matches: string[] } | null = null;
  try {
    const sim = await findSimilarScans({
      domStructHash: result.domStructHash,
      screenshotHash: result.screenshotHash,
    });
    if (sim?.hasMalicious && capabilities.similaritySearch) {
      similarToMalicious = true;
      similarityPayload = {
        hash: sim.hash,
        matches: sim.matches.filter((m) => m.malicious).map((m) => m.scanId).slice(0, 10),
      };
      flags.push({
        kind: "similar_to_malicious",
        payload: similarityPayload,
      });
      flagKinds.push("similar_to_malicious");
    }
  } catch (err) {
    console.warn("[persistFinishedReport] similarity search failed:", err);
  }

  const trust = computeTrustScore(
    inputsFromScanResult(result, flagKinds, similarToMalicious)
  );

  const newStatus: SafetyStatus = result.verdicts.overall.malicious
    ? "malicious"
    : "safe";

  // ── Upsert the scan_reports row by scan_id ─────────────────────────────
  const [reportRow] = await db
    .insert(scanReports)
    .values({
      linkId,
      workspaceId,
      scanId: result.uuid,
      status: "finished",
      fetchedAt: new Date(),
      malicious: result.verdicts.overall.malicious,
      phishingKit: result.verdicts.overall.phishing?.[0] ?? null,
      pageUrl: result.page.url || null,
      pageIp: result.page.ip || null,
      pageAsn: result.page.asn || null,
      pageAsnName: result.page.asnName || null,
      pageCountry: result.page.country || null,
      pageServer: result.page.server || null,
      domStructHash: result.domStructHash,
      screenshotHash: result.screenshotHash,
      faviconHash: result.faviconHash,
      radarRank: result.radarRank,
      trustScore: trust.score,
      trustBand: trust.band,
      weightVersion: trust.weightVersion,
      redirectChain: result.redirectChain,
      categories: result.categories,
      technologies: result.technologies,
      contactedIps: result.contactedIps,
      contactedAsns: result.contactedAsns,
      contactedDomains: result.contactedDomains,
      certificates: result.certificates,
      performance: result.performance,
      cookiesSummary: result.cookies,
      globalsSummary: result.globals,
      consoleSummary: result.console,
      rawPayload: result.raw as Record<string, unknown>,
      similarToMalicious: similarityPayload,
    })
    .onConflictDoUpdate({
      target: scanReports.scanId,
      set: {
        status: "finished",
        fetchedAt: new Date(),
        malicious: result.verdicts.overall.malicious,
        phishingKit: result.verdicts.overall.phishing?.[0] ?? null,
        pageUrl: result.page.url || null,
        pageIp: result.page.ip || null,
        pageAsn: result.page.asn || null,
        pageAsnName: result.page.asnName || null,
        pageCountry: result.page.country || null,
        pageServer: result.page.server || null,
        domStructHash: result.domStructHash,
        screenshotHash: result.screenshotHash,
        faviconHash: result.faviconHash,
        radarRank: result.radarRank,
        trustScore: trust.score,
        trustBand: trust.band,
        weightVersion: trust.weightVersion,
        redirectChain: result.redirectChain,
        categories: result.categories,
        technologies: result.technologies,
        contactedIps: result.contactedIps,
        contactedAsns: result.contactedAsns,
        contactedDomains: result.contactedDomains,
        certificates: result.certificates,
        performance: result.performance,
        cookiesSummary: result.cookies,
        globalsSummary: result.globals,
        consoleSummary: result.console,
        rawPayload: result.raw as Record<string, unknown>,
        similarToMalicious: similarityPayload,
        updatedAt: new Date(),
      },
    })
    .returning({ id: scanReports.id });

  // ── Replace asset_risk_flags for this scan (idempotent) ────────────────
  await db.delete(assetRiskFlags).where(eq(assetRiskFlags.scanId, reportRow.id));
  if (flags.length > 0) {
    await db.insert(assetRiskFlags).values(
      flags.map((f) => ({
        scanId: reportRow.id,
        linkId,
        kind: f.kind,
        payload: f.payload,
      }))
    );
  }

  // ── Persist screenshot bytes (Req 6) ──────────────────────────────────
  // Fetched lazily, gated on the workspace plan capability so we don't
  // waste storage on plans that can't surface them. The bytes are stored
  // raw (bytea) — no base64 inflation, no re-encoding (PNG is already
  // losslessly compressed).
  if (capabilities.screenshot && result.screenshotHash) {
    const shot = await fetchScanScreenshot(result.uuid, "desktop").catch(
      () => null
    );
    if (shot) {
      await db
        .insert(scanScreenshots)
        .values({
          scanReportId: reportRow.id,
          scanId: result.uuid,
          linkId,
          workspaceId,
          resolution: "desktop",
          mimeType: shot.mimeType,
          bytes: shot.bytes,
          sizeBytes: shot.sizeBytes,
        })
        .onConflictDoNothing({
          target: [scanScreenshots.scanId, scanScreenshots.resolution],
        });
    } else {
      await db
        .update(scanReports)
        .set({ screenshotUnavailable: true })
        .where(eq(scanReports.id, reportRow.id));
    }
  }

  // ── Mirror onto the link row ──────────────────────────────────────────
  await db
    .update(links)
    .set({
      safetyStatus: newStatus,
      safetyScannedAt: new Date(),
      safetyVerdict: {
        malicious: result.verdicts.overall.malicious,
        categories: result.categories,
        phishing: result.verdicts.overall.phishing,
        domain: result.page.domain,
        country: result.page.country,
        asn: result.page.asn,
        asnName: result.page.asnName,
        technologies: result.technologies?.slice(0, 12).map((t) => ({
          name: t.name,
          categories: t.categories,
        })),
      },
      safetyTrustScore: trust.score,
      safetyTrustBand: trust.band,
      safetyWeightVersion: TRUST_WEIGHT_VERSION,
    })
    .where(eq(links.id, linkId));

  // ── Fetch HAR summary + DOM analysis (non-blocking, parallel) ────────
  try {
    const [har, dom] = await Promise.all([
      getScanHar(result.uuid).catch(() => null),
      getScanDom(result.uuid).catch(() => null),
    ]);

    const updates: Record<string, unknown> = {};

    if (har) {
      updates.harSummary = summarizeHar(har, result.page.domain || undefined);
    }
    if (dom) {
      updates.domAnalysis = analyzeDom(dom, result.page.domain || undefined);
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(scanReports)
        .set(updates)
        .where(eq(scanReports.id, reportRow.id));
    }
  } catch (err) {
    console.warn("[persistFinishedReport] HAR/DOM enrichment failed (non-blocking):", err);
  }

  // PostHog: safety_scan_completed (Req 25.3)
  trackSafetyScanCompleted({
    workspaceId,
    linkId,
    scanId: result.uuid,
    trustScore: trust.score,
    trustBand: trust.band,
    malicious: result.verdicts.overall.malicious,
    cacheHit: false,
  }).catch(() => {});

  return { newStatus, trust, flags };
}

interface SafetyWebhookContext {
  workspaceId: string;
  linkId: string;
  scanId: string;
  previousBand: TrustBand;
  nextBand: TrustBand;
  trustScore: number;
  malicious: boolean;
}

async function maybeFireSafetyWebhook(ctx: SafetyWebhookContext): Promise<void> {
  if (ctx.previousBand === ctx.nextBand) return; // dedup (Req 12.5)

  // Audit log every band transition (Req 25.1)
  logAudit({
    workspaceId: ctx.workspaceId,
    actorId: "system",
    action: "update",
    entityType: "link",
    entityId: ctx.linkId,
    metadata: {
      event: "safety_band_changed",
      previousBand: ctx.previousBand,
      nextBand: ctx.nextBand,
      scanId: ctx.scanId,
      trustScore: ctx.trustScore,
    },
  }).catch(() => {});

  // PostHog (Req 25.3)
  trackSafetyBandChange({
    workspaceId: ctx.workspaceId,
    linkId: ctx.linkId,
    scanId: ctx.scanId,
    previousBand: ctx.previousBand,
    nextBand: ctx.nextBand,
    trustScore: ctx.trustScore,
  }).catch(() => {});

  // Only fire for state transitions that matter.
  if (ctx.nextBand === "low" && ctx.previousBand !== "low") {
    await sendWebhookEvent({
      eventType: "link.flagged_malicious",
      workspaceId: ctx.workspaceId,
      data: {
        linkId: ctx.linkId,
        scanId: ctx.scanId,
        trustScore: ctx.trustScore,
        trustBand: ctx.nextBand,
        malicious: ctx.malicious,
      },
      idempotencyKey: `link.flagged_malicious-${ctx.linkId}-${ctx.scanId}`,
    }).catch(() => {});
  } else if (ctx.previousBand === "low" && ctx.nextBand !== "low") {
    await sendWebhookEvent({
      eventType: "link.flagged_safe",
      workspaceId: ctx.workspaceId,
      data: {
        linkId: ctx.linkId,
        scanId: ctx.scanId,
        trustScore: ctx.trustScore,
        trustBand: ctx.nextBand,
      },
      idempotencyKey: `link.flagged_safe-${ctx.linkId}-${ctx.scanId}`,
    }).catch(() => {});
  }
}

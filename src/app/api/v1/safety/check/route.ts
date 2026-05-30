import { NextResponse } from "next/server";
import { db, scanReports, workspaces, assetRiskFlags } from "@/lib/db";
import { eq, desc, gt } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api-auth";
import { safetyCapabilitiesForPlan } from "@/lib/cloudflare/safety-capabilities";
import { tryReserveScan, releaseReservation } from "@/lib/cloudflare/scan-quota";
import {
  submitUrlScan,
  getScanResult,
} from "@/lib/cloudflare/url-scanner";
import {
  computeTrustScore,
  inputsFromScanResult,
} from "@/lib/cloudflare/trust-score";
import { analyzeAssetRisks } from "@/lib/cloudflare/asset-risk-analyzer";
import { incrementUsage } from "@/lib/billing/usage";

/**
 * GET /api/v1/safety/check?url=<encoded>
 *
 * Public read-only Trust API (Reqs 16, 17). Authenticate with a Bearer
 * API key. Plan-gated to Business+. Returns:
 *   - 200 with cached result when a fresh scan exists (cacheHit=true)
 *   - 200 with fresh result when a new scan finishes within 30s
 *   - 202 with { scanId } when the scan is still in progress
 *
 * Cache TTL bound: 6h (∈ [1h, 24h] per Req 24.2).
 *
 * Round-trip property (Req 17.1): the `url` field returned is identical
 * to the canonicalized form of the submitted URL.
 */

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FRESH_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { workspaceId, keyId } = authResult;

  // ── Plan gate (Req 16.3) ──────────────────────────────────────────────
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { plan: true },
  });
  const capabilities = safetyCapabilitiesForPlan(ws?.plan ?? "free");
  if (!capabilities.trustApi) {
    return NextResponse.json(
      { error: "plan_upgrade_required" },
      { status: 403 }
    );
  }

  // ── URL validation (Req 16.10) ────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  let canonical: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "invalid_url" }, { status: 400 });
    }
    // Canonicalize: lowercase host, drop trailing slash on path-only URLs
    parsed.hostname = parsed.hostname.toLowerCase();
    canonical = parsed.toString();
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  // ── Cache lookup (Reqs 16.4, 16.7) ────────────────────────────────────
  const cacheCutoff = new Date(Date.now() - CACHE_TTL_MS);
  const [cached] = await db
    .select()
    .from(scanReports)
    .where(
      eq(scanReports.workspaceId, workspaceId)
    )
    .orderBy(desc(scanReports.fetchedAt))
    .limit(50);

  // Find the most recent finished report for this exact URL within TTL
  const fresh = await db
    .select()
    .from(scanReports)
    .where(
      eq(scanReports.workspaceId, workspaceId)
    )
    .orderBy(desc(scanReports.fetchedAt))
    .limit(200);

  const freshHit = fresh.find(
    (r) =>
      r.status === "finished" &&
      r.pageUrl === canonical &&
      r.fetchedAt &&
      r.fetchedAt >= cacheCutoff
  );

  if (freshHit) {
    const flags = await db
      .select({ kind: assetRiskFlags.kind })
      .from(assetRiskFlags)
      .where(eq(assetRiskFlags.scanId, freshHit.id));

    await incrementUsage(workspaceId, "apiCalls", 1).catch(() => {});

    // PostHog (Req 25.4)
    void import("@/lib/posthog").then(({ trackTrustApiCall }) =>
      trackTrustApiCall({
        workspaceId,
        apiKeyId: keyId,
        cacheHit: true,
        responseStatus: 200,
      }).catch(() => {})
    );

    return NextResponse.json({
      url: canonical,
      cacheHit: true,
      scanId: freshHit.scanId,
      trustScore: freshHit.trustScore,
      trustBand: freshHit.trustBand,
      verdict: {
        malicious: freshHit.malicious === true,
        phishingKit: freshHit.phishingKit,
      },
      categories: freshHit.categories ?? [],
      assetRiskFlags: flags.map((f) => f.kind),
      redirectChainLength: Array.isArray(freshHit.redirectChain)
        ? freshHit.redirectChain.length
        : 0,
      scannedAt: freshHit.fetchedAt,
    });
  }

  // ── No fresh cache — submit a new scan ────────────────────────────────
  const quota = await tryReserveScan(workspaceId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error:
          quota.reason === "global"
            ? "global_quota_exceeded"
            : "workspace_quota_exceeded",
      },
      { status: 429 }
    );
  }

  let scanId: string;
  try {
    const submission = await submitUrlScan(canonical, { visibility: "Unlisted" });
    scanId = submission.uuid;
  } catch (err) {
    await releaseReservation(workspaceId);
    console.error("[trust-api] scan submit failed", err);
    return NextResponse.json({ error: "submit_failed" }, { status: 502 });
  }

  // Poll for up to 30s (Req 16.6)
  const deadline = Date.now() + FRESH_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    let result;
    try {
      result = await getScanResult(scanId);
    } catch {
      // Network blip — keep waiting
      continue;
    }
    if (!result || result.status !== "Finished") continue;

    // Build response on the fly (no DB persistence here — this URL
    // belongs to an external customer, not a LinkForge link)
    const flags = analyzeAssetRisks(result);
    const trust = computeTrustScore(
      inputsFromScanResult(result, flags.map((f) => f.kind), false)
    );

    await incrementUsage(workspaceId, "apiCalls", 1).catch(() => {});

    return NextResponse.json({
      url: canonical,
      cacheHit: false,
      scanId,
      trustScore: trust.score,
      trustBand: trust.band,
      verdict: {
        malicious: result.verdicts.overall.malicious,
        phishingKit: result.verdicts.overall.phishing?.[0] ?? null,
      },
      categories: result.categories,
      assetRiskFlags: flags.map((f) => f.kind),
      redirectChainLength: result.redirectChain.length,
      scannedAt: new Date(),
    });
  }

  // Still running after 30s — return 202 with the scan ID for client polling
  await incrementUsage(workspaceId, "apiCalls", 1).catch(() => {});
  return NextResponse.json(
    {
      url: canonical,
      scanId,
      status: "in_progress",
      pollUrl: `/api/v1/safety/check/${scanId}`,
    },
    { status: 202 }
  );
}

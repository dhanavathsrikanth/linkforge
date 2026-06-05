import { NextResponse } from "next/server";
import { db, links, scanReports, workspaces } from "@/lib/db";
import { and, eq, sql, lt, isNotNull, or, isNull } from "drizzle-orm";
import { startSafetyScan, refreshSafetyVerdict, startBulkSafetyScan } from "@/lib/cloudflare/link-safety";
import { safetyCapabilitiesForPlan } from "@/lib/cloudflare/safety-capabilities";

/**
 * POST /api/internal/url-scanner/rescan-due
 *
 * Cron endpoint (Req 11). Selects links eligible for rescanning based on
 * Trust Band + age, plus links stuck in `pending` for over 1 hour, and
 * enqueues a fresh scan for each.
 *
 * Authentication: `x-internal-secret: <INTERNAL_SECRET>`. The endpoint is
 * idempotent — re-running it picks up where the previous run left off.
 *
 * Selection rules (Req 11.2-11.4):
 *   - verified/high band, scanned > 7 days ago         → reason: age_verified
 *   - low/medium  band, scanned > 24 hours ago         → reason: age_low
 *   - status=pending or band=null, > 1 hour old        → reason: pending_stuck / error_retry
 *
 * Per-workspace ceiling (Req 11.8): max 1,000 rescans / 24h. We cap the
 * batch per request to `BATCH_SIZE` so a single cron invocation can't
 * burn through quotas.
 */

const BATCH_SIZE = 200;

interface RescanCandidate {
  linkId: string;
  destination: string;
  workspaceId: string;
  reason: "age_verified" | "age_low" | "pending_stuck";
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // ── Candidate set 1: verified/high, > 7 days ──────────────────────────
  const stale = await db
    .select({
      linkId: links.id,
      destination: links.destination,
      workspaceId: links.workspaceId,
      band: links.safetyTrustBand,
      scannedAt: links.safetyScannedAt,
    })
    .from(links)
    .where(
      and(
        sql`${links.safetyTrustBand} IN ('high', 'verified')`,
        isNotNull(links.safetyScannedAt),
        lt(links.safetyScannedAt, sevenDaysAgo)
      )
    )
    .limit(BATCH_SIZE);

  // ── Candidate set 2: low/medium, > 24h ─────────────────────────────────
  const flagged = await db
    .select({
      linkId: links.id,
      destination: links.destination,
      workspaceId: links.workspaceId,
      band: links.safetyTrustBand,
      scannedAt: links.safetyScannedAt,
    })
    .from(links)
    .where(
      and(
        sql`${links.safetyTrustBand} IN ('low', 'medium')`,
        isNotNull(links.safetyScannedAt),
        lt(links.safetyScannedAt, oneDayAgo)
      )
    )
    .limit(BATCH_SIZE);

  // ── Candidate set 3: pending stuck > 1h ────────────────────────────────
  const stuck = await db
    .select({
      linkId: links.id,
      destination: links.destination,
      workspaceId: links.workspaceId,
      scannedAt: links.safetyScannedAt,
    })
    .from(links)
    .where(
      and(
        eq(links.safetyStatus, "pending"),
        or(isNull(links.safetyScannedAt), lt(links.safetyScannedAt, oneHourAgo))
      )
    )
    .limit(BATCH_SIZE);

  // ── Candidate set 4: never scanned (`unknown`) ───────────────────────
  const unscanned = await db
    .select({
      linkId: links.id,
      destination: links.destination,
      workspaceId: links.workspaceId,
      scannedAt: links.safetyScannedAt,
    })
    .from(links)
    .where(
      and(
        eq(links.safetyStatus, "unknown"),
        isNull(links.safetyScanId)
      )
    )
    .limit(BATCH_SIZE);

  const candidates: RescanCandidate[] = [
    ...stale.map((r) => ({
      linkId: r.linkId,
      destination: r.destination,
      workspaceId: r.workspaceId,
      reason: "age_verified" as const,
    })),
    ...flagged.map((r) => ({
      linkId: r.linkId,
      destination: r.destination,
      workspaceId: r.workspaceId,
      reason: "age_low" as const,
    })),
    ...stuck.map((r) => ({
      linkId: r.linkId,
      destination: r.destination,
      workspaceId: r.workspaceId,
      reason: "pending_stuck" as const,
    })),
    ...unscanned.map((r) => ({
      linkId: r.linkId,
      destination: r.destination,
      workspaceId: r.workspaceId,
      reason: "pending_stuck" as const,
    })),
  ];

  // Deduplicate by linkId (first-wins) so the same link can't be triple-counted
  const seen = new Set<string>();
  const dedup: RescanCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.linkId)) continue;
    seen.add(c.linkId);
    dedup.push(c);
  }

  // ── Resolve workspace plans, drop those that don't permit scheduled rescans
  const workspaceIds = Array.from(new Set(dedup.map((c) => c.workspaceId)));
  const wsRows = workspaceIds.length
    ? await db
        .select({ id: workspaces.id, plan: workspaces.plan })
        .from(workspaces)
        .where(sql`${workspaces.id} IN (${sql.join(workspaceIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];
  const planByWs = new Map(wsRows.map((w) => [w.id, w.plan]));

  const eligible = dedup.filter((c) => {
    const plan = planByWs.get(c.workspaceId) ?? "free";
    return safetyCapabilitiesForPlan(plan).scheduledRescan;
  });

  // ── Process pending_stuck first by polling Cloudflare for the latest
  // verdict before submitting a new scan — saves quota. Other reasons go
  // to the bulk endpoint (one HTTP call for up to 100 URLs).
  const results = {
    polled: 0,
    polled_resolved: 0,
    submitted: 0,
    quota_blocked: 0,
    failed: 0,
  };

  const stuckCandidates = eligible.filter((c) => c.reason === "pending_stuck");
  const bulkCandidates = eligible
    .filter((c) => c.reason !== "pending_stuck")
    .slice(0, BATCH_SIZE);

  // Poll stuck-pending links first
  for (const c of stuckCandidates.slice(0, BATCH_SIZE)) {
    try {
      const refreshed = await refreshSafetyVerdict(c.linkId);
      results.polled++;
      if (refreshed && refreshed.status !== "unknown") {
        results.polled_resolved++;
        continue; // verdict is in — no need to start a new scan
      }
    } catch {
      /* fall through to a fresh submission */
    }
    // Still stuck — submit individually (keeps per-link lock semantics)
    try {
      const r = await startSafetyScan(c.linkId, c.destination, {
        rescanReason: c.reason,
      });
      if (r.submitted) results.submitted++;
      else if (r.reason?.startsWith("quota_exceeded")) results.quota_blocked++;
      else results.failed++;
    } catch {
      results.failed++;
    }
  }

  // Submit age-based candidates in bulk (up to 100 per Cloudflare limit)
  if (bulkCandidates.length > 0) {
    const bulkResult = await startBulkSafetyScan(bulkCandidates, {
      rescanReason: "scheduled",
    });
    results.submitted += bulkResult.submitted;
    results.quota_blocked += bulkResult.quotaBlocked;
    results.failed += bulkResult.failed;
  }

  return NextResponse.json({
    candidates: dedup.length,
    eligible: eligible.length,
    processed: Math.min(eligible.length, BATCH_SIZE),
    ...results,
  });
}

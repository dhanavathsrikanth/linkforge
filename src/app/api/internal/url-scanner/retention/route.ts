import { NextResponse } from "next/server";
import { db, scanReports, scanScreenshots, assetRiskFlags, safetyPurgeRequests } from "@/lib/db";
import { and, eq, lt, ne, sql, notInArray, isNull, lte } from "drizzle-orm";
import { workspaces } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/audit";

/**
 * POST /api/internal/url-scanner/retention
 *
 * Retention service (Req 19). Runs daily via GitHub Actions cron.
 * Deletes:
 *   - Screenshots older than 30 days that are NOT the latest finished
 *     scan for their link (enterprise: 210 days)
 *   - Scan report rows (non-latest) older than 180 days (enterprise: 360 days)
 *
 * Keeps:
 *   - The latest finished scan_report row for every link (always)
 *   - Screenshots for the latest finished scan (always)
 *
 * Auth: x-internal-secret header.
 */

const SCREENSHOT_RETENTION_DAYS = 30;
const SCREENSHOT_RETENTION_ENTERPRISE_DAYS = 210;
const REPORT_RETENTION_DAYS = 180;
const REPORT_RETENTION_ENTERPRISE_DAYS = 360;

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    screenshotsDeleted: 0,
    reportsDeleted: 0,
    flagsDeleted: 0,
  };

  // ── Resolve enterprise workspace IDs ──────────────────────────────────
  const enterpriseWs = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.plan, "enterprise"));
  const enterpriseIds = new Set(enterpriseWs.map((w) => w.id));

  // ── Find the latest finished scan_report id per link ──────────────────
  // We keep these unconditionally (Req 19.4).
  const latestRows = await db.execute(sql`
    SELECT DISTINCT ON (link_id) id
    FROM scan_reports
    WHERE status = 'finished'
    ORDER BY link_id, fetched_at DESC NULLS LAST
  `);
  const latestIds = (latestRows.rows as { id: string }[]).map((r) => r.id);

  // ── Delete stale screenshots ──────────────────────────────────────────
  // For each workspace, apply the appropriate retention window.
  // We delete screenshots whose scan_report_id is NOT in latestIds AND
  // whose fetched_at is older than the retention window.
  const stdScreenshotCutoff = new Date(
    now.getTime() - SCREENSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const entScreenshotCutoff = new Date(
    now.getTime() - SCREENSHOT_RETENTION_ENTERPRISE_DAYS * 24 * 60 * 60 * 1000
  );

  // Standard workspaces
  if (latestIds.length > 0) {
    const stdDeleted = await db
      .delete(scanScreenshots)
      .where(
        and(
          lt(scanScreenshots.fetchedAt, stdScreenshotCutoff),
          notInArray(scanScreenshots.scanReportId, latestIds),
          enterpriseIds.size > 0
            ? notInArray(scanScreenshots.workspaceId, Array.from(enterpriseIds))
            : sql`true`
        )
      )
      .returning({ id: scanScreenshots.id });
    results.screenshotsDeleted += stdDeleted.length;

    // Enterprise workspaces (longer window)
    if (enterpriseIds.size > 0) {
      const entDeleted = await db
        .delete(scanScreenshots)
        .where(
          and(
            lt(scanScreenshots.fetchedAt, entScreenshotCutoff),
            notInArray(scanScreenshots.scanReportId, latestIds),
            sql`${scanScreenshots.workspaceId} = ANY(ARRAY[${sql.join(
              Array.from(enterpriseIds).map((id) => sql`${id}::uuid`),
              sql`, `
            )}])`
          )
        )
        .returning({ id: scanScreenshots.id });
      results.screenshotsDeleted += entDeleted.length;
    }
  }

  // ── Delete stale scan_reports (non-latest, old) ───────────────────────
  const stdReportCutoff = new Date(
    now.getTime() - REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const entReportCutoff = new Date(
    now.getTime() - REPORT_RETENTION_ENTERPRISE_DAYS * 24 * 60 * 60 * 1000
  );

  if (latestIds.length > 0) {
    const stdReportsDeleted = await db
      .delete(scanReports)
      .where(
        and(
          lt(scanReports.fetchedAt, stdReportCutoff),
          notInArray(scanReports.id, latestIds),
          enterpriseIds.size > 0
            ? notInArray(scanReports.workspaceId, Array.from(enterpriseIds))
            : sql`true`
        )
      )
      .returning({ id: scanReports.id });
    results.reportsDeleted += stdReportsDeleted.length;

    if (enterpriseIds.size > 0) {
      const entReportsDeleted = await db
        .delete(scanReports)
        .where(
          and(
            lt(scanReports.fetchedAt, entReportCutoff),
            notInArray(scanReports.id, latestIds),
            sql`${scanReports.workspaceId} = ANY(ARRAY[${sql.join(
              Array.from(enterpriseIds).map((id) => sql`${id}::uuid`),
              sql`, `
            )}])`
          )
        )
        .returning({ id: scanReports.id });
      results.reportsDeleted += entReportsDeleted.length;
    }
  }

  // ── Execute deferred RTBF purge requests (Req 21.3) ─────────────────────
  // Select requests whose purge_after has elapsed and haven't been executed.
  const duePurges = await db
    .select({ id: safetyPurgeRequests.id, linkId: safetyPurgeRequests.linkId, workspaceId: safetyPurgeRequests.workspaceId })
    .from(safetyPurgeRequests)
    .where(and(lte(safetyPurgeRequests.purgeAfter, now), isNull(safetyPurgeRequests.purgedAt)));

  let rtbfPurged = 0;
  for (const req of duePurges) {
    // scan_reports cascade-deletes screenshots + flags via FK
    await db
      .delete(scanReports)
      .where(eq(scanReports.linkId, req.linkId))
      .catch(() => {});

    await db
      .update(safetyPurgeRequests)
      .set({ purgedAt: now })
      .where(eq(safetyPurgeRequests.id, req.id));

    logAudit({
      workspaceId: req.workspaceId,
      actorId: "system",
      action: "safety.rtbf_purge",
      entityType: "scan_report",
      entityId: req.linkId,
      metadata: { deferred: true, executedAt: now.toISOString() },
    }).catch(() => {});

    rtbfPurged++;
  }

  // ── Audit log (Req 19.7) ──────────────────────────────────────────────
  if (results.screenshotsDeleted > 0 || results.reportsDeleted > 0 || rtbfPurged > 0) {
    logAudit({
      workspaceId: "system",
      actorId: "system",
      action: "retention.sweep",
      entityType: "scan_report",
      entityId: "retention-sweep",
      metadata: {
        event: "retention_sweep",
        ...results,
        rtbfPurged,
        runAt: now.toISOString(),
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ...results, rtbfPurged, runAt: now.toISOString() });
}

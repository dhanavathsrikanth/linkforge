import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, links, scanReports, scanScreenshots, assetRiskFlags, safetyPurgeRequests } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";

/**
 * DELETE /api/links/[id]/safety-data
 *
 * Right-To-Be-Forgotten endpoint (Req 21). Workspace operators can request
 * purging of all Cloudflare URL Scanner data associated with a link:
 *   - scan_reports rows
 *   - scan_screenshots rows (bytea bytes)
 *   - asset_risk_flags rows
 *
 * Behaviour:
 *   - If the link still exists: purge immediately and record the audit entry.
 *   - If the link has already been deleted (404): record a deferred purge
 *     request in `safety_purge_requests` with `purge_after = now() + 7 days`.
 *     The daily retention cron sweeps and executes these.
 *
 * Requires workspace admin role (owner or admin). Platform admins can purge
 * any link by passing `?platformAdmin=1` — validated against Clerk metadata.
 *
 * Idempotent: calling it twice for the same link is safe (second call is a
 * no-op if data is already gone).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: linkId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // ── Resolve the link (may already be deleted) ─────────────────────────
    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.id, linkId),
      columns: { id: true, workspaceId: true, slug: true },
    });

    // Determine workspace for auth — use the link's workspace if it exists,
    // otherwise require the caller to pass workspaceId in the query string.
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = link?.workspaceId ?? searchParams.get("workspaceId");
    if (!workspaceIdParam) {
      return NextResponse.json(
        { error: "workspaceId required when link is already deleted" },
        { status: 400 }
      );
    }

    // Auth: workspace admin or platform admin
    const isPlatformAdmin =
      (dbUser.publicMetadata as Record<string, unknown> | undefined)
        ?.platformAdmin === true;

    if (!isPlatformAdmin) {
      let ws;
      try {
        ws = await resolveUserWorkspace(dbUser.id, workspaceIdParam);
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!canAdmin(ws.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (link) {
      // ── Link exists — purge immediately ──────────────────────────────────
      // Cascade deletes handle scan_screenshots and asset_risk_flags via FK.
      const deleted = await db
        .delete(scanReports)
        .where(eq(scanReports.linkId, linkId))
        .returning({ id: scanReports.id });

      await logAudit({
        workspaceId: workspaceIdParam,
        actorId: dbUser.id,
        action: "safety.rtbf_purge",
        entityType: "scan_report",
        entityId: linkId,
        metadata: {
          reportsDeleted: deleted.length,
          immediate: true,
        },
      });

      return NextResponse.json({
        ok: true,
        linkId,
        immediate: true,
        reportsDeleted: deleted.length,
      });
    } else {
      // ── Link already deleted — queue a deferred purge ────────────────────
      // Check if a pending request already exists (idempotency).
      const existing = await db.query.safetyPurgeRequests.findFirst({
        where: (r, { eq, and, isNull }) =>
          and(eq(r.linkId, linkId), isNull(r.purgedAt)),
      });

      if (existing) {
        return NextResponse.json({
          ok: true,
          linkId,
          immediate: false,
          deferred: true,
          purgeAfter: existing.purgeAfter,
          message: "Purge already queued",
        });
      }

      const purgeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.insert(safetyPurgeRequests).values({
        linkId,
        workspaceId: workspaceIdParam,
        requestedBy: dbUser.id,
        purgeAfter,
      });

      await logAudit({
        workspaceId: workspaceIdParam,
        actorId: dbUser.id,
        action: "safety.rtbf_purge",
        entityType: "scan_report",
        entityId: linkId,
        metadata: {
          immediate: false,
          purgeAfter: purgeAfter.toISOString(),
        },
      });

      return NextResponse.json({
        ok: true,
        linkId,
        immediate: false,
        deferred: true,
        purgeAfter,
        message: "Purge queued. Data will be deleted within 7 days.",
      });
    }
  } catch (err) {
    console.error("[DELETE /api/links/[id]/safety-data]", err);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}

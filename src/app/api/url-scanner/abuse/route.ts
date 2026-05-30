import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, links, scanReports, assetRiskFlags } from "@/lib/db";
import { and, desc, eq, or, sql, inArray } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { workspaces } from "@/lib/db/schema";

/**
 * GET /api/url-scanner/abuse?workspaceId=...
 *
 * Abuse Dashboard data (Req 15). Returns flagged links for:
 *   - Workspace_Admin: links in their workspace only
 *   - Platform_Admin (publicMetadata.platformAdmin = true): all workspaces
 *
 * A link is "flagged" when:
 *   - Cloudflare verdict is malicious, OR
 *   - safety_blocked_by_admin is true, OR
 *   - Trust Band is 'low' AND the latest scan has at least one AssetRiskFlag
 *
 * POST /api/url-scanner/abuse — action on a flagged link
 * Body: { linkId, action: "block" | "unblock" | "rescan" }
 */

function isPlatformAdmin(user: { publicMetadata?: unknown }): boolean {
  const meta = user.publicMetadata as Record<string, unknown> | undefined;
  return meta?.platformAdmin === true;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const platformAdmin = isPlatformAdmin(dbUser);

    // Determine scope
    let workspaceIds: string[] | null = null; // null = all (platform admin)
    if (!platformAdmin) {
      // Must be a workspace admin
      let ws;
      try {
        ws = await resolveUserWorkspace(dbUser.id, workspaceIdParam);
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!canAdmin(ws.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      workspaceIds = [ws.id];
    }

    // ── Fetch flagged links ───────────────────────────────────────────────
    const baseCondition = or(
      eq(links.safetyStatus, "malicious"),
      eq(links.safetyBlockedByAdmin, true),
      sql`${links.safetyTrustBand} = 'low'`
    )!;

    const rows = await db
      .select({
        id: links.id,
        slug: links.slug,
        destination: links.destination,
        title: links.title,
        workspaceId: links.workspaceId,
        safetyStatus: links.safetyStatus,
        safetyTrustScore: links.safetyTrustScore,
        safetyTrustBand: links.safetyTrustBand,
        safetyScannedAt: links.safetyScannedAt,
        safetyBlockedByAdmin: links.safetyBlockedByAdmin,
        safetyScanId: links.safetyScanId,
        createdAt: links.createdAt,
      })
      .from(links)
      .where(
        workspaceIds
          ? and(baseCondition, inArray(links.workspaceId, workspaceIds))
          : baseCondition
      )
      .orderBy(desc(links.safetyScannedAt), desc(links.createdAt))
      .limit(500);

    // Attach workspace names for platform admin view
    let wsNames: Map<string, string> = new Map();
    if (platformAdmin && rows.length > 0) {
      const wsIds = Array.from(new Set(rows.map((r) => r.workspaceId)));
      const wsRows = await db
        .select({ id: workspaces.id, name: workspaces.name })
        .from(workspaces)
        .where(inArray(workspaces.id, wsIds));
      wsNames = new Map(wsRows.map((w) => [w.id, w.name]));
    }

    // Attach asset risk flag counts
    const linkIds = rows.map((r) => r.id);
    const flagCounts =
      linkIds.length > 0
        ? await db
            .select({
              linkId: assetRiskFlags.linkId,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(assetRiskFlags)
            .where(inArray(assetRiskFlags.linkId, linkIds))
            .groupBy(assetRiskFlags.linkId)
        : [];
    const flagCountMap = new Map(flagCounts.map((f) => [f.linkId, f.count]));

    const enriched = rows.map((r) => ({
      ...r,
      workspaceName: wsNames.get(r.workspaceId) ?? null,
      assetRiskFlagCount: flagCountMap.get(r.id) ?? 0,
    }));

    return NextResponse.json({
      total: enriched.length,
      isPlatformAdmin: platformAdmin,
      links: enriched,
    });
  } catch (err) {
    console.error("[GET /api/url-scanner/abuse]", err);
    return NextResponse.json(
      { error: "Failed to load abuse data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { linkId, action } = (await req.json()) as {
      linkId?: string;
      action?: "block" | "unblock" | "rescan";
    };
    if (!linkId || !action) {
      return NextResponse.json(
        { error: "linkId and action are required" },
        { status: 400 }
      );
    }

    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.id, linkId),
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const platformAdmin = isPlatformAdmin(dbUser);
    if (!platformAdmin) {
      let ws;
      try {
        ws = await resolveUserWorkspace(dbUser.id, link.workspaceId);
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!canAdmin(ws.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Audit log BEFORE the action — if it fails we abort (Req 15.5)
    try {
      await import("@/lib/db/audit").then(({ logAudit }) =>
        logAudit({
          workspaceId: link.workspaceId,
          actorId: dbUser.id,
          action: action === "rescan" ? "update" : "update",
          entityType: "link",
          entityId: linkId,
          metadata: { abuseAction: action },
        })
      );
    } catch (auditErr) {
      console.error("[abuse POST] audit log failed — aborting action", auditErr);
      return NextResponse.json(
        { error: "Audit logging unavailable. Action aborted." },
        { status: 503 }
      );
    }

    if (action === "block") {
      await db
        .update(links)
        .set({ safetyBlockedByAdmin: true })
        .where(eq(links.id, linkId));
    } else if (action === "unblock") {
      await db
        .update(links)
        .set({ safetyBlockedByAdmin: false })
        .where(eq(links.id, linkId));
    } else if (action === "rescan") {
      const { rescanLinkSafety } = await import(
        "@/lib/cloudflare/link-safety"
      );
      await rescanLinkSafety(linkId, link.destination, "abuse_dashboard");
    }

    return NextResponse.json({ ok: true, linkId, action });
  } catch (err) {
    console.error("[POST /api/url-scanner/abuse]", err);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}

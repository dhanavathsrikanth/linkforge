import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace } from "@/lib/db/workspace";

/**
 * GET /api/url-scanner/links?workspaceId=...&status=malicious
 *
 * Returns links with their safety status for the Link Safety dashboard.
 * The optional `status` filter accepts: pending | safe | suspicious |
 * malicious | error | unknown | flagged (= malicious + suspicious).
 */
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
    const statusFilter = searchParams.get("status");

    const ws = await resolveUserWorkspace(dbUser.id, workspaceIdParam);

    // ── Aggregate counts (one row per status) ────────────────────────────
    const counts = await db
      .select({
        status: links.safetyStatus,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(links)
      .where(eq(links.workspaceId, ws.id))
      .groupBy(links.safetyStatus);

    // ── List of links (filtered) ─────────────────────────────────────────
    const SAFETY_STATUSES = ["unknown", "pending", "safe", "suspicious", "malicious", "error"] as const;
    type SafetyStatus = typeof SAFETY_STATUSES[number];

    const conditions = [eq(links.workspaceId, ws.id)];
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "flagged") {
        conditions.push(
          sql`${links.safetyStatus} IN ('malicious', 'suspicious') OR ${links.safetyBlockedByAdmin} = true`
        );
      } else if ((SAFETY_STATUSES as readonly string[]).includes(statusFilter)) {
        conditions.push(eq(links.safetyStatus, statusFilter as SafetyStatus));
      }
    }

    const rows = await db
      .select({
        id: links.id,
        slug: links.slug,
        destination: links.destination,
        title: links.title,
        safetyStatus: links.safetyStatus,
        safetyScanId: links.safetyScanId,
        safetyScannedAt: links.safetyScannedAt,
        safetyVerdict: links.safetyVerdict,
        safetyBlockedByAdmin: links.safetyBlockedByAdmin,
        safetyTrustScore: links.safetyTrustScore,
        safetyTrustBand: links.safetyTrustBand,
        createdAt: links.createdAt,
      })
      .from(links)
      .where(and(...conditions))
      .orderBy(desc(links.safetyScannedAt), desc(links.createdAt))
      .limit(200);

    return NextResponse.json({
      workspaceId: ws.id,
      counts: Object.fromEntries(counts.map((c) => [c.status, c.count])),
      links: rows,
    });
  } catch (err) {
    console.error("[GET /api/url-scanner/links]", err);
    return NextResponse.json(
      { error: "Failed to load link safety data" },
      { status: 500 }
    );
  }
}

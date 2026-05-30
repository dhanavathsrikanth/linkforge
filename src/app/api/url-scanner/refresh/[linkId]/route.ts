import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace } from "@/lib/db/workspace";
import { refreshSafetyVerdict } from "@/lib/cloudflare/link-safety";

/**
 * POST /api/url-scanner/refresh/[linkId]
 *
 * Polls Cloudflare for the latest verdict on a link's pending scan and
 * persists the result. Returns:
 *   - 200 + verdict when the scan finished
 *   - 202 when the scan is still running
 *   - 404 when no scan ID is stashed on the link (never scanned, or rescan
 *     failed at submit time)
 *
 * The Link Safety dashboard polls this endpoint for any link whose status
 * is `pending`.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { linkId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Verify the caller actually owns the workspace this link belongs to.
    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.id, linkId),
      columns: { id: true, workspaceId: true, safetyScanId: true },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    try {
      await resolveUserWorkspace(dbUser.id, link.workspaceId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!link.safetyScanId) {
      return NextResponse.json(
        { error: "No scan in progress for this link" },
        { status: 404 }
      );
    }

    const result = await refreshSafetyVerdict(linkId);
    if (!result) {
      return NextResponse.json(
        { status: "pending", linkId },
        { status: 202 }
      );
    }

    // Fetch the persisted verdict + page metadata for the response.
    const refreshed = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.id, linkId),
      columns: { safetyVerdict: true },
    });

    return NextResponse.json({
      status: result.status,
      linkId,
      trustScore: result.trustScore,
      trustBand: result.trustBand,
      verdict: refreshed?.safetyVerdict ?? null,
    });
  } catch (err) {
    console.error("[POST /api/url-scanner/refresh/[linkId]]", err);
    return NextResponse.json(
      { error: "Failed to refresh scan" },
      { status: 500 }
    );
  }
}

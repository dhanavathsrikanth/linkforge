import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { rescanLinkSafety, isUrlScannerConfigured } from "@/lib/cloudflare/link-safety";
import { rateLimitByUser } from "@/lib/rate-limiter";

/**
 * POST /api/url-scanner/rescan/[linkId]
 *
 * Re-submit the link's destination to Cloudflare URL Scanner. Drops any
 * existing scan ID/verdict so the dashboard shows `pending` immediately,
 * then submits a fresh scan in the background.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isUrlScannerConfigured()) {
    return NextResponse.json(
      {
        error:
          "URL Scanner is not configured. Set CLOUDFLARE_URL_SCANNER_TOKEN and CLOUDFLARE_ACCOUNT_ID.",
      },
      { status: 503 }
    );
  }

  try {
    const { linkId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const rateLimit = await rateLimitByUser(dbUser.id, "rescan:link", 30, 60);
    if (rateLimit) return rateLimit;

    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.id, linkId),
      columns: { id: true, workspaceId: true, destination: true },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, link.workspaceId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canWrite(ws.role)) {
      return NextResponse.json(
        { error: "You don't have permission to rescan links in this workspace" },
        { status: 403 }
      );
    }

    await rescanLinkSafety(link.id, link.destination);

    return NextResponse.json({ status: "pending", linkId });
  } catch (err) {
    console.error("[POST /api/url-scanner/rescan/[linkId]]", err);
    return NextResponse.json({ error: "Failed to rescan link" }, { status: 500 });
  }
}

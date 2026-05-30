import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, scanReports } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace } from "@/lib/db/workspace";
import { getScanHar } from "@/lib/cloudflare/url-scanner";

/**
 * GET /api/url-scanner/har/[scanId]
 *
 * Fetches the full HAR (network log) for a scan from Cloudflare on-demand.
 * The HAR can be large (hundreds of KB for complex pages) so we don't store
 * it — we proxy it directly from Cloudflare to the caller.
 *
 * Auth: Clerk session. The caller must own the workspace the scan belongs to.
 *
 * Returns the standard HAR 1.2 `{ log: { creator, entries, pages, version } }`
 * object, or 404 when the scan doesn't exist or the HAR isn't available yet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scanId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Verify the caller owns the workspace this scan belongs to
    const [report] = await db
      .select({ workspaceId: scanReports.workspaceId })
      .from(scanReports)
      .where(eq(scanReports.scanId, scanId))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    try {
      await resolveUserWorkspace(dbUser.id, report.workspaceId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const har = await getScanHar(scanId);
    if (!har) {
      return NextResponse.json(
        { error: "HAR not available for this scan" },
        { status: 404 }
      );
    }

    return NextResponse.json(har);
  } catch (err) {
    console.error("[GET /api/url-scanner/har/[scanId]]", err);
    return NextResponse.json({ error: "Failed to fetch HAR" }, { status: 500 });
  }
}

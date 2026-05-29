import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { submitUrlScan } from "@/lib/cloudflare/url-scanner";

/**
 * POST /api/url-scanner/scan
 *
 * Submit one or more URLs to Cloudflare's URL Scanner for deep security
 * analysis. Returns scan UUIDs that can be polled via GET /api/url-scanner/result/[scanId].
 *
 * Body: { urls: string[] }
 * Response: { scans: Array<{ url, uuid, error? }> }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { urls } = (await req.json()) as { urls?: string[] };
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 }
      );
    }

    // Limit to 20 URLs per request to avoid abuse
    const batch = urls.slice(0, 20);

    const scans = await Promise.all(
      batch.map(async (url) => {
        try {
          const result = await submitUrlScan(url, {
            visibility: "Unlisted",
          });
          return { url, uuid: result.uuid, error: null };
        } catch (err) {
          return {
            url,
            uuid: null,
            error: err instanceof Error ? err.message : "Submit failed",
          };
        }
      })
    );

    return NextResponse.json({ scans });
  } catch (err) {
    console.error("[POST /api/url-scanner/scan]", err);
    return NextResponse.json(
      { error: "Failed to submit scans" },
      { status: 500 }
    );
  }
}

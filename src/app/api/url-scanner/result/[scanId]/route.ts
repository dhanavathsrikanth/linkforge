import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getScanResult } from "@/lib/cloudflare/url-scanner";

/**
 * GET /api/url-scanner/result/[scanId]
 *
 * Poll for a Cloudflare URL Scanner result. Returns 202 while the scan
 * is still in progress, 200 when finished.
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
    const result = await getScanResult(scanId);

    if (!result) {
      // Still in progress
      return NextResponse.json(
        { status: "InProgress", uuid: scanId },
        { status: 202 }
      );
    }

    return NextResponse.json({
      status: result.status,
      uuid: result.uuid,
      url: result.url,
      submittedUrl: result.submittedUrl,
      malicious: result.verdicts.overall.malicious,
      categories: result.categories,
      phishing: result.verdicts.overall.phishing,
      technologies: result.technologies,
      page: result.page,
      certificates: result.certificates,
    });
  } catch (err) {
    console.error("[GET /api/url-scanner/result]", err);
    return NextResponse.json(
      { error: "Failed to fetch scan result" },
      { status: 500 }
    );
  }
}

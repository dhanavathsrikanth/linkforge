import { NextResponse } from "next/server";
import { db, scanScreenshots } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyScreenshotToken } from "@/lib/cloudflare/screenshot-token";

/**
 * GET /api/url-scanner/screenshot?token=...
 *
 * Serves a screenshot from the `scan_screenshots` table. The `token` param
 * is a short-lived (10-minute) HMAC-signed reference to the scan ID — see
 * `screenshot-token.ts`. Tokens are issued only by:
 *   - the dashboard details API (auth-checked)
 *   - the public `/s/[slug]/preview` page (workspace opt-in)
 *
 * Cache-Control is set to a small private max-age so the same token can be
 * reused inside its TTL without round-tripping the DB on every <img/> load,
 * but the asset is never publicly cacheable past the token's lifetime.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const verified = verifyScreenshotToken(token);
  if (!verified) {
    return NextResponse.json(
      { error: "invalid_or_expired_token" },
      { status: 401 }
    );
  }

  const [shot] = await db
    .select({
      bytes: scanScreenshots.bytes,
      mimeType: scanScreenshots.mimeType,
      sizeBytes: scanScreenshots.sizeBytes,
    })
    .from(scanScreenshots)
    .where(eq(scanScreenshots.scanId, verified.scanId))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new Response(shot.bytes, {
    status: 200,
    headers: {
      "Content-Type": shot.mimeType,
      "Content-Length": String(shot.sizeBytes),
      "Cache-Control": "private, max-age=300, immutable",
      // Hide from search engines / archivers — these are workspace assets
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

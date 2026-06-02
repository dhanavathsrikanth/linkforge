import { NextResponse } from "next/server";
import { db, scanScreenshots } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyScreenshotToken } from "@/lib/cloudflare/screenshot-token";
import { getFromR2 } from "@/lib/r2";

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
      r2Key: scanScreenshots.r2Key,
      mimeType: scanScreenshots.mimeType,
      sizeBytes: scanScreenshots.sizeBytes,
      bytes: scanScreenshots.bytes,
    })
    .from(scanScreenshots)
    .where(eq(scanScreenshots.scanId, verified.scanId))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // R2-stored screenshot
  if (shot.r2Key) {
    const r2Data = await getFromR2(shot.r2Key);
    if (!r2Data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return new Response(new Uint8Array(r2Data.body), {
      status: 200,
      headers: {
        "Content-Type": r2Data.contentType,
        "Content-Length": r2Data.body.byteLength.toString(),
        "Cache-Control": "private, max-age=300, immutable",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // Legacy bytea-stored screenshot
  if (!shot.bytes) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new Response(new Uint8Array(shot.bytes), {
    status: 200,
    headers: {
      "Content-Type": shot.mimeType,
      "Content-Length": String(shot.sizeBytes),
      "Cache-Control": "private, max-age=300, immutable",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

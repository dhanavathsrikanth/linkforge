import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGallery } from "@/lib/db";
import { eq } from "drizzle-orm";
import { recordBioPageView } from "@/lib/bio/track-view";

/**
 * POST /api/bio/analytics/track
 *
 * Thin HTTP wrapper around recordBioPageView().
 * In production this is called by the Cloudflare Worker which injects
 * cf-ipcountry / cf-connecting-ip headers.
 * In development the bio page calls recordBioPageView() directly so no
 * HTTP round-trip is needed.
 */
export async function POST(req: Request) {
  let body: { galleryId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { galleryId } = body;
  if (!galleryId) {
    return NextResponse.json({ error: "galleryId required" }, { status: 400 });
  }

  const gallery = await db.query.linkGallery.findFirst({
    where: eq(linkGallery.id, galleryId),
    columns: { id: true, isPublished: true },
  });

  if (!gallery?.isPublished) {
    return NextResponse.json({ ok: false });
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  await recordBioPageView({
    galleryId,
    ip,
    cfCountry: req.headers.get("cf-ipcountry"),
    vercelCountry: req.headers.get("x-vercel-ip-country"),
    deviceTypeHeader: req.headers.get("x-device-type"),
    userAgent: req.headers.get("user-agent"),
    referer: req.headers.get("referer"),
  });

  return NextResponse.json({ ok: true });
}

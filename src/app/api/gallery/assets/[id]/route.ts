import { db } from "@/lib/db";
import { linkGalleryAssets } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * GET /api/gallery/assets/[id]
 *
 * Serves a stored asset (base64 in Neon) as a real image response.
 * Public — no auth required so images render on the public bio page.
 * Cache-Control: 1 year immutable (assets are content-addressed by ID).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await db.query.linkGalleryAssets.findFirst({
    where: eq(linkGalleryAssets.id, id),
    columns: { data: true, mimeType: true, filename: true },
  });

  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  // Strip the data URI prefix if present (e.g. "data:image/png;base64,...")
  const base64 = asset.data.includes(",") ? asset.data.split(",")[1] : asset.data;

  const binary = Buffer.from(base64, "base64");

  return new Response(binary, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": binary.byteLength.toString(),
      // Immutable — the asset ID never changes for the same content
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${asset.filename}"`,
    },
  });
}

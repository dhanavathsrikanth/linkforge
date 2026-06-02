import { db } from "@/lib/db";
import { linkGalleryAssets } from "@/lib/db";
import { getFromR2 } from "@/lib/r2";
import { eq } from "drizzle-orm";

const R2_PREFIX = "r2:";

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

  // R2-stored asset
  if (asset.data.startsWith(R2_PREFIX)) {
    const r2Key = asset.data.slice(R2_PREFIX.length);
    const r2Data = await getFromR2(r2Key);
    if (!r2Data) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(new Uint8Array(r2Data.body), {
      headers: {
        "Content-Type": r2Data.contentType,
        "Content-Length": r2Data.body.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${asset.filename}"`,
      },
    });
  }

  // Legacy base64-stored asset
  const base64 = asset.data.includes(",") ? asset.data.split(",")[1] : asset.data;
  const binary = Buffer.from(base64, "base64");

  return new Response(binary, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": binary.byteLength.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${asset.filename}"`,
    },
  });
}

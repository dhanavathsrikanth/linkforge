import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get("size") || "512");
  const format = searchParams.get("format") || "png";

  const link = await db.query.links.findFirst({
    where: and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)),
  });

  if (!link) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Link not found." } },
      { status: 404 }
    );
  }

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(link.destination, {
        type: "svg",
        width: size,
        margin: 1,
      });
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const pngBuffer = await QRCode.toBuffer(link.destination, {
      type: "png",
      width: size,
      margin: 1,
    });

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/qr/[id]]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate QR code." } },
      { status: 500 }
    );
  }
}

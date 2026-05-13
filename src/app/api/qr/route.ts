import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import QRCode from "qrcode";
import { z } from "zod";
import { rateLimitMiddleware } from "@/lib/rate-limiter";

const QRParamsSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  size: z.coerce.number().int().min(64).max(2048).default(512),
  fgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour like #000000")
    .default("#000000"),
  bgColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6}|transparent)$/, "Must be a hex colour or 'transparent'")
    .default("#ffffff"),
  errorLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
});

/**
 * GET /api/qr
 * Returns a PNG QR code image for the given URL + styling params.
 * Requires auth (route is used inside the dashboard).
 * Rate limited: 60 requests / minute per user.
 */
export async function GET(req: NextRequest) {
  // Auth check — dashboard-only endpoint
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 QR generations per minute per user
  const rateLimitResult = await rateLimitMiddleware(req, { limit: 60, window: 60 }, `qr:${userId}`);
  if (rateLimitResult instanceof NextResponse) return rateLimitResult;

  // Parse and validate query params
  const { searchParams } = req.nextUrl;
  const raw = {
    url: searchParams.get("url") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    fgColor: searchParams.get("fgColor") ?? undefined,
    bgColor: searchParams.get("bgColor") ?? undefined,
    errorLevel: searchParams.get("errorLevel") ?? undefined,
  };

  const parsed = QRParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { url, size, fgColor, bgColor, errorLevel } = parsed.data;

  try {
    const pngBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: size,
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor === "transparent" ? "#00000000" : bgColor,
      },
      errorCorrectionLevel: errorLevel,
    });

    // slice() copies Buffer bytes into a plain ArrayBuffer, which BodyInit accepts
    const arrayBuffer: ArrayBuffer = pngBuffer.buffer.slice(
      pngBuffer.byteOffset,
      pngBuffer.byteOffset + pngBuffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[GET /api/qr]", err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}

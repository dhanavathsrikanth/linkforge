import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { checkLimit } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";

const QRParamsSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  size: z.coerce.number().int().min(64).max(2048).default(512),
  fgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour like #000000").default("#000000"),
  bgColor: z.string().regex(/^(#[0-9a-fA-F]{6}|transparent)$/, "Must be a hex colour or 'transparent'").default("#ffffff"),
  errorLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
});

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
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
      { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { url, size, fgColor, bgColor, errorLevel } = parsed.data;

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, auth.workspaceId),
  });
  if (!ws) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Workspace not found." } },
      { status: 404 }
    );
  }

  const limitCheck = await checkLimit(auth.workspaceId, "qrCodesPerMonth", false);
  if (!limitCheck.allowed) {
    return billingLimitError("qrCodesPerMonth", limitCheck.current, limitCheck.limit, ws.plan);
  }

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

    const arrayBuffer: ArrayBuffer = pngBuffer.buffer.slice(
      pngBuffer.byteOffset,
      pngBuffer.byteOffset + pngBuffer.byteLength
    ) as ArrayBuffer;

    await checkLimit(auth.workspaceId, "qrCodesPerMonth", true);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[GET /api/v2/qr]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate QR code." } },
      { status: 500 }
    );
  }
}

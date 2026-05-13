import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, links } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";

const QRSettingsSchema = z.object({
  fgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour like #000000")
    .default("#000000"),
  bgColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6}|transparent)$/)
    .default("#ffffff"),
  errorLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
  size: z.number().int().min(128).max(1024).default(256),
  /**
   * base64 data URL. We cap at ~68 KB (50 KB binary → ~68 KB base64).
   * Clients must enforce the 50 KB limit before encoding.
   */
  logoUrl: z.string().max(70_000).optional(),
  rounded: z.boolean().default(false),
  frameStyle: z.enum(["none", "scan-me"]).default("none"),
  frameText: z.string().max(80).optional(),
});

/**
 * PATCH /api/links/[id]/qr
 * Persist QR customization settings for a link the authenticated user owns.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    // Verify ownership
    const link = await db.query.links.findFirst({
      where: (l, { eq: eqFn, and }) => and(eqFn(l.id, id), eqFn(l.userId, dbUser.id)),
    });
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const body = await req.json();
    const parsed = QRSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const [updated] = await db
      .update(links)
      .set({ qrSettings: parsed.data, updatedAt: new Date() })
      .where(eq(links.id, id))
      .returning();

    return NextResponse.json({ link: updated });
  } catch (err) {
    console.error("[PATCH /api/links/[id]/qr]", err);
    return NextResponse.json({ error: "Failed to save QR settings" }, { status: 500 });
  }
}

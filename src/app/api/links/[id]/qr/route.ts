import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, links } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";

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
  logoUrl: z.string().max(70_000).optional(),
  logoSize: z.enum(["small", "medium", "large"]).optional(),
  logoOpacity: z.number().min(0).max(1).optional(),
  rounded: z.boolean().default(false),
  frameStyle: z.enum(["none", "scan-me"]).default("none"),
  frameText: z.string().max(80).optional(),
  marginSize: z.number().int().min(0).max(8).optional(),
  boostLevel: z.boolean().optional(),
  minVersion: z.number().int().min(1).max(40).optional(),
});

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

    const link = await db.query.links.findFirst({
      where: eq(links.id, id),
    });
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const ws = await resolveUserWorkspace(dbUser.id, link.workspaceId);
    if (!canWrite(ws.role)) {
      return NextResponse.json({ error: "You don't have permission to modify QR settings" }, { status: 403 });
    }

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
    console.error("[PATCH /api/links/:id/qr]", err);
    return NextResponse.json({ error: "Failed to update QR settings" }, { status: 500 });
  }
}

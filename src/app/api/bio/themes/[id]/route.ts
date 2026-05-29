import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, bioThemes } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { THEME_FIELDS } from "@/lib/bio/theme";

const HslColorSchema = z.object({
  h: z.number(),
  s: z.number(),
  l: z.number(),
  a: z.number().optional(),
});

const UpdateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  font: z.string().nullable().optional(),
  backgroundImage: z.string().nullable().optional(),
  colors: z.object(
    Object.fromEntries(THEME_FIELDS.map((f) => [f, HslColorSchema.optional()]))
  ).optional(),
});

// PATCH /api/bio/themes/:id — update a theme
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { id } = await params;

  const existing = await db.query.bioThemes.findFirst({
    where: eq(bioThemes.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const ws = await resolveUserWorkspace(dbUser.id);
  if (!canAdmin(ws.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateThemeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, font, backgroundImage, colors } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (font !== undefined) updateData.font = font;
  if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;
  if (colors) {
    for (const f of THEME_FIELDS) {
      if ((colors as any)[f] !== undefined) {
        updateData[f] = (colors as any)[f];
      }
    }
  }

  const [theme] = await db
    .update(bioThemes)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(bioThemes.id, id))
    .returning();

  return NextResponse.json({ theme });
}

// DELETE /api/bio/themes/:id — delete a theme
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { id } = await params;

  const ws = await resolveUserWorkspace(dbUser.id);
  if (!canAdmin(ws.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(bioThemes).where(eq(bioThemes.id, id));

  return NextResponse.json({ success: true });
}

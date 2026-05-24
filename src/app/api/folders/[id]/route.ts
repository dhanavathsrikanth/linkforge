import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { folders } from "@/lib/db";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { eq } from "drizzle-orm";

const UpdateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(200).optional().nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a valid hex color").optional(),
  icon: z.string().max(50).optional(),
});

// Helper to fetch folder and verify permissions
async function getFolderAndVerify(folderId: string, dbUserId: string, requireWrite = true) {
  const [folder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, folderId));

  if (!folder) {
    throw new Error("Folder not found");
  }

  const ws = await resolveUserWorkspace(dbUserId, folder.workspaceId);
  if (requireWrite && !canWrite(ws.role)) {
    throw new Error("Forbidden");
  }

  return { folder, ws };
}

// GET /api/folders/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;

    let folder;
    try {
      const result = await getFolderAndVerify(id, dbUser.id, false);
      folder = result.folder;
    } catch (err: any) {
      if (err.message === "Folder not found") return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      return NextResponse.json({ error: "Workspace access denied" }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (err) {
    console.error("[GET /api/folders/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch folder" }, { status: 500 });
  }
}

// PATCH /api/folders/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

    let folder, ws;
    try {
      const result = await getFolderAndVerify(id, dbUser.id, true);
      folder = result.folder;
      ws = result.ws;
    } catch (err: any) {
      if (err.message === "Folder not found") return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      if (err.message === "Forbidden") return NextResponse.json({ error: "You don't have permission to update folders in this workspace" }, { status: 403 });
      return NextResponse.json({ error: "Workspace access denied" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (v.name !== undefined) updateData.name = v.name;
    if (v.description !== undefined) updateData.description = v.description;
    if (v.color !== undefined) updateData.color = v.color;
    if (v.icon !== undefined) updateData.icon = v.icon;

    const [updated] = await db
      .update(folders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();

    return NextResponse.json({ folder: updated });
  } catch (err) {
    console.error("[PATCH /api/folders/[id]]", err);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

// DELETE /api/folders/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;

    let folder;
    try {
      const result = await getFolderAndVerify(id, dbUser.id, true);
      folder = result.folder;
    } catch (err: any) {
      if (err.message === "Folder not found") return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      if (err.message === "Forbidden") return NextResponse.json({ error: "You don't have permission to delete folders in this workspace" }, { status: 403 });
      return NextResponse.json({ error: "Workspace access denied" }, { status: 404 });
    }

    await db.delete(folders).where(eq(folders.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/folders/[id]]", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceTags } from "@/lib/db";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { eq, and, sql } from "drizzle-orm";

const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).transform(s => s.toLowerCase().trim()).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a valid hex color").optional(),
  description: z.string().max(200).optional().nullable(),
});

// Helper to fetch tag and verify permissions
async function getTagAndVerify(tagId: string, dbUserId: string, requireWrite = true) {
  const [tag] = await db
    .select()
    .from(workspaceTags)
    .where(eq(workspaceTags.id, tagId));

  if (!tag) {
    throw new Error("Tag not found");
  }

  const ws = await resolveUserWorkspace(dbUserId, tag.workspaceId);
  if (requireWrite && !canWrite(ws.role)) {
    throw new Error("Forbidden");
  }

  return { tag, ws };
}

// PATCH /api/tags/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await request.json();
    const parsed = UpdateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

    let tag, ws;
    try {
      const result = await getTagAndVerify(id, dbUser.id, true);
      tag = result.tag;
      ws = result.ws;
    } catch (err: any) {
      if (err.message === "Tag not found") return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      if (err.message === "Forbidden") return NextResponse.json({ error: "You don't have permission to modify tags in this workspace" }, { status: 403 });
      return NextResponse.json({ error: "Workspace access denied" }, { status: 404 });
    }

    const updateData: any = {};
    if (v.color !== undefined) updateData.color = v.color;
    if (v.description !== undefined) updateData.description = v.description;

    if (v.name !== undefined && v.name !== tag.name) {
      // Check if tag with the new name already exists in this workspace
      const [existing] = await db
        .select()
        .from(workspaceTags)
        .where(
          and(
            eq(workspaceTags.workspaceId, ws.id),
            eq(workspaceTags.name, v.name)
          )
        );

      if (existing) {
        return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
      }

      updateData.name = v.name;

      // Update all links referencing the old name
      await db.execute(
        sql`UPDATE links SET tags = array_replace(tags, ${tag.name}, ${v.name}) WHERE workspace_id = ${ws.id}::uuid`
      );
    }

    const [updatedTag] = await db
      .update(workspaceTags)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(workspaceTags.id, id))
      .returning();

    return NextResponse.json({ tag: updatedTag });
  } catch (err) {
    console.error("[PATCH /api/tags/[id]]", err);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

// DELETE /api/tags/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    let tag, ws;
    try {
      const result = await getTagAndVerify(id, dbUser.id, true);
      tag = result.tag;
      ws = result.ws;
    } catch (err: any) {
      if (err.message === "Tag not found") return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      if (err.message === "Forbidden") return NextResponse.json({ error: "You don't have permission to delete tags in this workspace" }, { status: 403 });
      return NextResponse.json({ error: "Workspace access denied" }, { status: 404 });
    }

    // 1. Remove the tag from all links in this workspace
    await db.execute(
      sql`UPDATE links SET tags = array_remove(tags, ${tag.name}) WHERE workspace_id = ${ws.id}::uuid`
    );

    // 2. Delete the tag record
    await db.delete(workspaceTags).where(eq(workspaceTags.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tags/[id]]", err);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

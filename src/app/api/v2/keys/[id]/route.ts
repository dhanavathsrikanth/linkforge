import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { apiKeys, workspaces } from "@/lib/db/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .limit(1);

  if (!workspace) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  const { id } = await params;

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspace.id)))
    .limit(1);

  if (!key) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "API key not found." } }, { status: 404 });
  }

  await db
    .update(apiKeys)
    .set({ active: false })
    .where(eq(apiKeys.id, id));

  return NextResponse.json({ data: { revoked: true } });
}

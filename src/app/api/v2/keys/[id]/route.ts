import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { apiKeys, workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { invalidateApiKeyCache } from "@/lib/api-auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (!dbUser) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const preferredId = searchParams.get("workspaceId");

  let workspaceId: string | undefined;
  if (preferredId) {
    const [ws] = await db
      .select({ id: workspaces.id, ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, preferredId))
      .limit(1);
    if (ws) {
      if (ws.ownerId === dbUser.id) {
        workspaceId = ws.id;
      } else {
        const [membership] = await db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, ws.id),
              eq(workspaceMembers.userId, dbUser.id)
            )
          )
          .limit(1);
        if (membership) workspaceId = ws.id;
      }
    }
  } else {
    const [ws] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.ownerId, dbUser.id))
      .limit(1);
    workspaceId = ws?.id;
  }

  if (!workspaceId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  const { id } = await params;

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId)))
    .limit(1);

  if (!key) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "API key not found." } }, { status: 404 });
  }

  await db
    .update(apiKeys)
    .set({ active: false })
    .where(eq(apiKeys.id, id));

  // Invalidate Redis cache + Worker KV edge cache
  invalidateApiKeyCache(key.keyHash);
  const workerUrl = process.env.CF_WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (workerUrl && secret) {
    fetch(`${workerUrl}/internal/api-key-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-worker-secret': secret },
      body: JSON.stringify({ keyHash: key.keyHash, remove: true }),
    }).catch(() => {});
  }

  return NextResponse.json({ data: { revoked: true } });
}

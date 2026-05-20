import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { apiKeys, workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { createApiKey } from "@/lib/api-auth";

async function resolveWorkspace(userId: string, preferredId?: string | null): Promise<string | null> {
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (!dbUser) return null;

  if (preferredId) {
    // Validate user has access to this workspace
    const [ws] = await db
      .select({ id: workspaces.id, ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, preferredId))
      .limit(1);
    if (!ws) return null;
    if (ws.ownerId === dbUser.id) return ws.id;

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
    return membership ? ws.id : null;
  }

  // Fall back to personal workspace
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, dbUser.id))
    .limit(1);

  return workspace?.id ?? null;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const preferredId = searchParams.get("workspaceId");

  const workspaceId = await resolveWorkspace(userId, preferredId);
  if (!workspaceId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      keyType: apiKeys.keyType,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      active: apiKeys.active,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, workspaceId))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json({ data: keys, workspaceId });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const preferredId = body.workspaceId;

  const workspaceId = await resolveWorkspace(userId, preferredId);
  if (!workspaceId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  try {
    const { name, keyType = "secret" } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Name is required." } },
        { status: 400 }
      );
    }

    if (keyType !== "secret" && keyType !== "publishable") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "keyType must be 'secret' or 'publishable'." } },
        { status: 400 }
      );
    }

    const { plaintextKey, keyPrefix } = await createApiKey(workspaceId, name.trim(), keyType);

    return NextResponse.json({
      data: {
        name: name.trim(),
        keyPrefix,
        keyType,
        plaintextKey,
      },
    });
  } catch (err) {
    console.error("[POST /api/v2/keys]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create API key." } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { apiKeys, workspaces, users } from "@/lib/db/schema";
import { createApiKey } from "@/lib/api-auth";

async function getWorkspaceId(userId: string): Promise<string | null> {
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (!dbUser) return null;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, dbUser.id))
    .limit(1);

  return workspace?.id ?? null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const workspaceId = await getWorkspaceId(userId);
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

  return NextResponse.json({ data: keys });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  try {
    const body = await req.json();
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

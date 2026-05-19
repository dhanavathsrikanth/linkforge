import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { apiKeys, workspaces } from "@/lib/db/schema";
import { createApiKey } from "@/lib/api-auth";

export async function GET() {
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
    .where(eq(apiKeys.workspaceId, workspace.id))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json({ data: keys });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
  }

  const [workspace] = await db
    .select({ id: workspaces.id, plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .limit(1);

  if (!workspace) {
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

    const { plaintextKey, keyPrefix } = await createApiKey(workspace.id, name.trim(), keyType);

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

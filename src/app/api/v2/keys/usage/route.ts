import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { apiKeys, workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { getAllApiKeyUsage, trackApiKeyUsage } from "@/lib/api-auth";
import { getEffectiveLimits } from "@/lib/billing/usage";

async function resolveWorkspace(userId: string, preferredId?: string | null): Promise<string | null> {
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (!dbUser) return null;

  if (preferredId) {
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
        eq(workspaceMembers.workspaceId, ws.id) && eq(workspaceMembers.userId, dbUser.id)
      )
      .limit(1);
    return membership ? ws.id : null;
  }

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
  const workspaceId = await resolveWorkspace(userId, searchParams.get("workspaceId"));
  if (!workspaceId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No workspace found." } }, { status: 404 });
  }

  // Get all API keys for this workspace
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

  if (keys.length === 0) {
    // Get workspace plan limits even when no keys exist
    const limits = await getEffectiveLimits(workspaceId);
    return NextResponse.json({ 
      data: [], 
      workspaceId,
      summary: {
        totalKeys: 0,
        activeKeys: 0,
        totalCallsThisHour: 0,
        totalCallsToday: 0,
        plan: {
          apiCallsPerHour: limits.apiCallsPerHour,
          apiCallsPerMonth: limits.apiCallsPerHour === -1 ? -1 : limits.apiCallsPerHour * 24 * 30,
        },
      }
    });
  }

  // Get usage for all keys
  const keyIds = keys.map(k => k.id);
  const usageData = await getAllApiKeyUsage(workspaceId, keyIds);
  
  // Get workspace plan limits
  const limits = await getEffectiveLimits(workspaceId);

  // Build response with usage merged
  const data = keys.map(key => ({
    ...key,
    usage: usageData[key.id] || { callsThisHour: 0, callsToday: 0, lastCall: null },
  }));

  // Calculate summary
  const summary = {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.active).length,
    totalCallsThisHour: Object.values(usageData).reduce((sum, u) => sum + u.callsThisHour, 0),
    totalCallsToday: Object.values(usageData).reduce((sum, u) => sum + u.callsToday, 0),
    plan: {
      apiCallsPerHour: limits.apiCallsPerHour,
      apiCallsPerMonth: limits.apiCallsPerHour === -1 ? -1 : limits.apiCallsPerHour * 24 * 30,
    },
  };

  return NextResponse.json({ data, workspaceId, summary });
}
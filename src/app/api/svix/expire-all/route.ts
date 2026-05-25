export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { expireAllSessions } from "@/lib/svix/application";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { workspaceId, sessionId, sessionIds, expiry }: { workspaceId?: string; sessionId?: string; sessionIds?: string[]; expiry?: number } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Only admins can manage webhooks" }, { status: 403 });
    }

    await expireAllSessions(workspaceId, { sessionIds: sessionIds ?? (sessionId ? [sessionId] : undefined), expiry });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/svix/expire-all]", err);
    return NextResponse.json({ error: "Failed to expire sessions" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;

    const ws = await resolveUserWorkspace(dbUser.id, id);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Only workspace admins can view audit logs" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.workspaceId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[GET /api/workspaces/[id]/audit-logs]", err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

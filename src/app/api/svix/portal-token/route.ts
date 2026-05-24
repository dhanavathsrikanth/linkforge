import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { createSvixApp, getSvixAppPortalUrl } from "@/lib/svix/application";

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

    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Only admins can manage webhooks" }, { status: 403 });
    }

    const portalUrl = await getSvixAppPortalUrl(workspaceId);
    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    console.error("[POST /api/svix/portal-token]", err);
    return NextResponse.json({ error: "Failed to generate portal token" }, { status: 500 });
  }
}

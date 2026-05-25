import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { getSvixAppPortalUrl } from "@/lib/svix/application";
import type { AppPortalOptions } from "@/lib/svix/application";

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

    const body = await req.json();
    const { workspaceId }: { workspaceId?: string } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Only admins can manage webhooks" }, { status: 403 });
    }

    const options: AppPortalOptions = {};
    if (body.featureFlags) options.featureFlags = body.featureFlags;
    if (body.sessionId) options.sessionId = body.sessionId;
    if (body.capabilities) options.capabilities = body.capabilities;
    if (body.expiry) options.expiry = body.expiry;
    if (body.application) options.application = body.application;
    if (body.primaryColorLight) options.primaryColorLight = body.primaryColorLight;
    if (body.primaryColorDark) options.primaryColorDark = body.primaryColorDark;
    if (body.icon) options.icon = body.icon;
    if (body.fontFamily) options.fontFamily = body.fontFamily;
    if (body.darkMode) options.darkMode = body.darkMode;
    if (body.hideNavigation) options.hideNavigation = body.hideNavigation;
    if (body.noGutters) options.noGutters = body.noGutters;
    if (body.next) options.next = body.next;

    const portalUrl = await getSvixAppPortalUrl(workspaceId, options);
    return NextResponse.json({ url: portalUrl });
  } catch (err) {
    console.error("[POST /api/svix/portal-token]", err);
    return NextResponse.json({ error: "Failed to generate portal token" }, { status: 500 });
  }
}

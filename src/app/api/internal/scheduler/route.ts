import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const secret = request.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, payload } = await request.json();

  switch (action) {
    case "activate_link": {
      const { linkId } = payload;
      await db.update(links).set({ isActive: true }).where(eq(links.id, linkId));
      return NextResponse.json({ activated: true, linkId });
    }
    case "deactivate_link": {
      const { linkId } = payload;
      await db.update(links).set({ isActive: false }).where(eq(links.id, linkId));
      return NextResponse.json({ deactivated: true, linkId });
    }
    case "conclude_ab_test": {
      const { linkId } = payload;
      await db.update(links).set({ abTestEnabled: false }).where(eq(links.id, linkId));
      return NextResponse.json({ concluded: true, linkId });
    }
    case "send_digest": {
      const { workspaceId } = payload;
      return NextResponse.json({ digestSent: true, workspaceId });
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

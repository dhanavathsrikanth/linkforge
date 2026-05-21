import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains, links } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
  }

  try {
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, id),
      with: { workspace: true }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, domainRecord.workspaceId);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Forbidden: Only workspace admins can delete domains" }, { status: 403 });
    }

    const allWorkspaceDomains = await db.query.domains.findMany({
      where: and(
        eq(domains.workspaceId, domainRecord.workspaceId),
        eq(domains.verified, true)
      )
    });

    if (domainRecord.verified && allWorkspaceDomains.length === 1) {
      return NextResponse.json({ error: "Cannot delete the only verified domain. Add another verified domain first." }, { status: 400 });
    }

    await db
      .update(links)
      .set({ domainId: null })
      .where(eq(links.domainId, id));

    await db.delete(domains).where(eq(domains.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/domains/:id]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { id } = await params;

  try {
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, id),
      with: { workspace: true }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, domainRecord.workspaceId);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Forbidden: Only workspace admins can manage domains" }, { status: 403 });
    }

    if (!domainRecord.verified) {
      return NextResponse.json({ error: "Only verified domains can be set as primary" }, { status: 400 });
    }

    await db
      .update(domains)
      .set({ isDefault: false })
      .where(eq(domains.workspaceId, domainRecord.workspaceId));

    const [updated] = await db
      .update(domains)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(domains.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/domains/:id]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

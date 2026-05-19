import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains, links } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
  }

  try {
    // Check if domain exists and user has access
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, id),
      with: {
        workspace: true
      }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domainRecord.workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden: Only workspace owner can delete domains" }, { status: 403 });
    }

    // Check if it's the only verified domain. We might want to prevent deleting the last verified domain,
    // or just let them if they want to use the default one. The spec says "Cannot delete if it's the only verified domain".
    const allWorkspaceDomains = await db.query.domains.findMany({
      where: and(
        eq(domains.workspaceId, domainRecord.workspaceId),
        eq(domains.verified, true)
      )
    });

    if (domainRecord.verified && allWorkspaceDomains.length === 1) {
      return NextResponse.json({ error: "Cannot delete the only verified domain. Add another verified domain first." }, { status: 400 });
    }

    // Unlink all links using this domain (fallback to default domain)
    await db
      .update(links)
      .set({ domainId: null })
      .where(eq(links.domainId, id));

    // Delete the domain
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

  const { id } = await params;

  try {
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, id),
      with: {
        workspace: true
      }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domainRecord.workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!domainRecord.verified) {
      return NextResponse.json({ error: "Only verified domains can be set as primary" }, { status: 400 });
    }

    // Set all other domains in the workspace to not default
    await db
      .update(domains)
      .set({ isDefault: false })
      .where(eq(domains.workspaceId, domainRecord.workspaceId));

    // Set this domain as default
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

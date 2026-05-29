import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { linkGallery, linkGalleryIntegrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// DELETE /api/gallery/integrations/[integrationId] — disconnect an integration
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { integrationId } = await params;

  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { eq }) => eq(g.userId, dbUser.id),
  });
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  const [integration] = await db
    .select()
    .from(linkGalleryIntegrations)
    .where(and(
      eq(linkGalleryIntegrations.id, integrationId),
      eq(linkGalleryIntegrations.galleryId, gallery.id)
    ))
    .limit(1);

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  await db
    .delete(linkGalleryIntegrations)
    .where(eq(linkGalleryIntegrations.id, integrationId));

  return NextResponse.json({ success: true });
}

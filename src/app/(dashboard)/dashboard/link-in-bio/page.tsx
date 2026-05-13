import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { GalleryBuilder } from "@/components/gallery/GalleryBuilder";
import type { GalleryPage } from "@/types/gallery";
import { DEFAULT_APPEARANCE } from "@/types/gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link in Bio Builder",
};

export default async function LinkInBioPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  // Fetch gallery (the API route handles auto-create, but we do it server-side here for SSR)
  let gallery = await db.query.linkGallery.findFirst({
    where: (g, { eq }) => eq(g.userId, dbUser.id),
  });

  // Auto-create if none exists
  if (!gallery) {
    const { nanoid } = await import("nanoid");
    const workspace = await db.query.workspaces.findFirst({
      where: (w, { eq }) => eq(w.ownerId, dbUser.id),
    });

    if (workspace) {
      const slug = dbUser.username
        ? dbUser.username.toLowerCase().replace(/[^a-z0-9-_]/g, "-")
        : nanoid(8);

      const existing = await db.query.linkGallery.findFirst({
        where: (g, { eq }) => eq(g.slug, slug),
      });
      const finalSlug = existing ? nanoid(8) : slug;

      const { linkGallery } = await import("@/lib/db");
      [gallery] = await db.insert(linkGallery).values({
        userId: dbUser.id,
        workspaceId: workspace.id,
        slug: finalSlug,
        displayName: dbUser.name ?? dbUser.firstName ?? "My Page",
        bio: "Welcome to my page!",
        avatarInitials: (dbUser.firstName?.charAt(0) ?? "U").toUpperCase(),
        avatarBgColor: "#6366f1",
        links: [],
        appearance: DEFAULT_APPEARANCE,
        showBranding: true,
        isPublished: false,
      }).returning();
    }
  }

  if (!gallery) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          No workspace found. Please create a workspace first.
        </p>
      </div>
    );
  }

  // Fetch verified domains
  const domains = await db.query.domains.findMany({
    where: (d, { and, eq }) =>
      and(eq(d.workspaceId, gallery!.workspaceId), eq(d.verified, true)),
  });

  const isPaidPlan = dbUser.plan !== "free";

  const galleryPage: GalleryPage = {
    ...gallery,
    links: (gallery.links ?? []) as GalleryPage["links"],
    appearance: (gallery.appearance ?? DEFAULT_APPEARANCE) as GalleryPage["appearance"],
  };

  return (
    <div className="h-full flex flex-col">
      <GalleryBuilder
        initialGallery={galleryPage}
        domains={domains.map((d) => ({ id: d.id, domain: d.domain }))}
        isPaidPlan={isPaidPlan}
      />
    </div>
  );
}

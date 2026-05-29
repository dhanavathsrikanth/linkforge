import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db, linkGallery } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { BioAnalyticsPage } from "@/components/bio/standalone/BioAnalyticsPage";

export const metadata = { title: "Bio analytics" };

export default async function BioAnalyticsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  const { id } = await params;

  // Just enough to confirm ownership + render the title.
  const gallery = await db
    .select({
      id: linkGallery.id,
      slug: linkGallery.slug,
      displayName: linkGallery.displayName,
      isPublished: linkGallery.isPublished,
    })
    .from(linkGallery)
    .where(and(eq(linkGallery.id, id), eq(linkGallery.userId, dbUser.id)))
    .limit(1);
  if (gallery.length === 0) notFound();

  return (
    <BioAnalyticsPage
      galleryId={gallery[0].id}
      slug={gallery[0].slug}
      displayName={gallery[0].displayName}
      isPublished={gallery[0].isPublished}
    />
  );
}

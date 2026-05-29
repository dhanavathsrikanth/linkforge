import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db, linkGallery } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

/**
 * Per-bio layout. Verifies ownership, then passes children through.
 *
 * Each child page handles its own visual chrome:
 *   - /edit → BioEditor renders full-page with sidebar
 *   - /settings → standalone padded page
 *   - /analytics → standalone padded page
 *
 * No shared client shell needed — avoids the "Router action dispatched
 * before initialization" error that occurred when usePathname() was
 * called in a layout-level client component.
 */
export default async function BioByIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  const { id } = await params;

  const gallery = await db
    .select({ id: linkGallery.id })
    .from(linkGallery)
    .where(and(eq(linkGallery.id, id), eq(linkGallery.userId, dbUser.id)))
    .limit(1);

  if (gallery.length === 0) notFound();

  return <>{children}</>;
}

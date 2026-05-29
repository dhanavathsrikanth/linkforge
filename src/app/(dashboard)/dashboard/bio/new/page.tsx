import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, linkGallery, linkGalleryBlocks } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { nanoid } from "nanoid";

export const metadata = { title: "New bio page" };

const RESERVED = new Set([
  "admin", "api", "p", "bio", "dashboard", "login", "signup",
  "sign-in", "sign-up", "blog", "pricing", "about", "contact",
  "help", "support", "terms", "privacy", "404", "500", "me",
  "home", "www", "app",
]);

/**
 * Slug-from-username helper. Lowercase, single-hyphen-separated,
 * 3–30 chars, no leading/trailing hyphens.
 */
function normalizeSlug(raw: string): string | null {
  const lowered = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const collapsed = lowered.replace(/-+/g, "-");
  const trimmed = collapsed.replace(/^-+|-+$/g, "");
  if (trimmed.length < 3 || trimmed.length > 30) return null;
  return trimmed;
}

/**
 * `/dashboard/bio/new` is a server action route — it creates a fresh
 * bio + seed Header block, then redirects the user straight into the
 * editor. The list page funnels first-time users here too.
 *
 * If the user has reached their plan's bio-page quota, we redirect
 * back to the list with an error param the list page can surface.
 */
export default async function NewBioPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.ownerId, dbUser.id),
  });
  if (!workspace) redirect("/dashboard");

  // Build a unique slug. Try username-derived first, fall back to nanoid.
  const candidate = dbUser.username ? normalizeSlug(dbUser.username) : null;
  const seed = candidate ?? nanoid(8);
  const slugBase = RESERVED.has(seed) ? nanoid(8) : seed;

  // Check uniqueness — append a short suffix if taken.
  const existing = await db.query.linkGallery.findFirst({
    where: (g, { eq }) => eq(g.slug, slugBase),
  });
  const finalSlug = existing ? nanoid(8) : slugBase;

  const [gallery] = await db
    .insert(linkGallery)
    .values({
      userId: dbUser.id,
      workspaceId: workspace.id,
      slug: finalSlug,
      displayName: dbUser.name ?? dbUser.firstName ?? "My Page",
      bio: "Welcome to my page!",
      avatarInitials: (dbUser.firstName?.charAt(0) ?? "U").toUpperCase(),
      avatarBgColor: "#6366f1",
      links: [],
      showBranding: true,
      isPublished: false,
      themeId: null,
    })
    .returning();

  // Seed a starter Header so the canvas isn't blank on first open.
  await db.insert(linkGalleryBlocks).values({
    galleryId: gallery.id,
    type: "header",
    sortOrder: 0,
    visible: true,
    config: {
      title: gallery.displayName ?? "Hello",
      description: gallery.bio ?? "Welcome to my page!",
      alignment: "left",
      avatar: { src: "" },
      __position: { x: 0, y: 0, w: 12, h: 6 },
      __positionXxs: { x: 0, y: 0, w: 4, h: 6 },
    } as Record<string, unknown>,
    data: {},
  });

  redirect(`/dashboard/bio/${gallery.id}/edit`);
}

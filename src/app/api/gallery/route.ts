import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGallery, domains } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEFAULT_APPEARANCE } from "@/types/gallery";
import { eq } from "drizzle-orm";

// M5: Reserved slugs that would collide with app routes
const RESERVED_SLUGS = new Set([
  "admin", "api", "p", "dashboard", "login", "signup", "sign-in", "sign-up",
  "blog", "pricing", "about", "contact", "help", "support", "terms", "privacy",
  "404", "500", "me", "home", "www", "app",
]);

// M5: Slug validation — lowercase, alphanumeric + hyphens, 3-30 chars, not reserved
const SlugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(30, "Slug must be at most 30 characters")
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, "Slug can only contain lowercase letters, numbers, and hyphens")
  .refine((s) => !RESERVED_SLUGS.has(s), "This slug is reserved");

const PatchSchema = z.object({
  displayName: z.string().max(80).optional().nullable(),
  bio: z.string().max(160).optional().nullable(),
  avatarInitials: z.string().max(4).optional().nullable(),
  avatarBgColor: z.string().optional(),
  // P4: Max 30 links enforced at API level
  links: z.array(z.object({
    id: z.string(),
    title: z.string().max(80),
    url: z.string().url(),
    emoji: z.string().optional(),
    visible: z.boolean(),
  })).max(30, "Maximum 30 links allowed").optional(),
  appearance: z.object({
    bgType: z.enum(["solid", "gradient", "preset"]),
    bgColor: z.string(),
    gradientFrom: z.string(),
    gradientTo: z.string(),
    gradientDir: z.number(),
    preset: z.enum(["dark", "light", "ocean", "sunset", "forest", "purple"]).optional(),
    buttonStyle: z.enum(["rounded", "pill", "square", "shadow"]),
    buttonColor: z.string(),
    buttonTextColor: z.string(),
    font: z.enum(["Inter", "Poppins", "Space Mono", "Playfair Display"]),
  }).optional(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  showBranding: z.boolean().optional(),
  // M5: Slug uses validated schema
  slug: SlugSchema.optional(),
  customDomainId: z.string().uuid().optional().nullable(),
  // P6: Client sends its local updatedAt for conflict detection
  updatedAt: z.string().datetime().optional(),
});

// GET /api/gallery — fetch (or create) the current user's gallery
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    let gallery = await db.query.linkGallery.findFirst({
      where: (g, { eq }) => eq(g.userId, dbUser.id),
    });

    if (!gallery) {
      const slug = dbUser.username
        ? dbUser.username.toLowerCase().replace(/[^a-z0-9-]/g, "-")
        : nanoid(8);

      const safeslug = RESERVED_SLUGS.has(slug) ? nanoid(8) : slug;
      const existing = await db.query.linkGallery.findFirst({
        where: (g, { eq }) => eq(g.slug, safeslug),
      });
      const finalSlug = existing ? nanoid(8) : safeslug;

      const workspace = await db.query.workspaces.findFirst({
        where: (w, { eq }) => eq(w.ownerId, dbUser.id),
      });
      if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

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

    const verifiedDomains = await db.query.domains.findMany({
      where: (d, { eq, and }) =>
        and(eq(d.workspaceId, gallery!.workspaceId), eq(d.verified, true)),
    });

    return NextResponse.json({ gallery, domains: verifiedDomains });
  } catch (err) {
    console.error("[GET /api/gallery]", err);
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}

// PATCH /api/gallery — auto-save updates
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = await db.query.linkGallery.findFirst({
      where: (g, { eq }) => eq(g.userId, dbUser.id),
    });
    if (!existing) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    // P6: Conflict detection — reject if server is newer than client's copy
    if (parsed.data.updatedAt) {
      const clientTs = new Date(parsed.data.updatedAt).getTime();
      const serverTs = existing.updatedAt?.getTime() ?? 0;
      if (serverTs > clientTs) {
        return NextResponse.json(
          { error: "conflict", message: "This page was updated elsewhere. Refresh to see the latest." },
          { status: 409 }
        );
      }
    }

    // M5: Slug uniqueness + reserved check if slug changed
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugTaken = await db.query.linkGallery.findFirst({
        where: (g, { eq }) => eq(g.slug, parsed.data.slug!),
      });
      if (slugTaken) return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }

    // Strip the client-side updatedAt before writing to DB
    const { updatedAt: _clientTs, ...dataToSave } = parsed.data;

    const [updated] = await db
      .update(linkGallery)
      .set({ ...dataToSave, updatedAt: new Date() })
      .where(eq(linkGallery.id, existing.id))
      .returning();

    return NextResponse.json({ gallery: updated });
  } catch (err) {
    console.error("[PATCH /api/gallery]", err);
    return NextResponse.json({ error: "Failed to update gallery" }, { status: 500 });
  }
}

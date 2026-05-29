import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGallery, domains, linkGalleryBlocks } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEFAULT_APPEARANCE } from "@/types/gallery";
import { eq } from "drizzle-orm";
import { checkLimit } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { rateLimitByUser } from "@/lib/rate-limiter";
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
  // Blocks for the new block-based system
  blocks: z.array(z.object({
    id: z.string(),
    type: z.enum([
      "header", "link-bar", "link-box", "links", "content", "image", "reaction",
      "youtube", "spotify-embed", "spotify-playing-now",
      "tiktok-latest-post", "tiktok-follower-count",
      "instagram-latest-post", "instagram-follower-count",
      "threads-follower-count", "github-commits-this-month",
      "stack", "map", "waitlist-email",
    ]),
    sortOrder: z.number().optional(),
    config: z.any().optional(),
    data: z.any().optional(),
    visible: z.boolean().optional(),
    integrationId: z.string().uuid().optional().nullable(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      static: z.boolean().optional(),
    }).optional().nullable(),
    theme: z.object({
      bgBase: z.string().optional(),
      bgPrimary: z.string().optional(),
      labelColor: z.string().optional(),
      borderColor: z.string().optional(),
      accentColor: z.string().optional(),
      borderRadius: z.string().optional(),
      padding: z.string().optional(),
    }).optional().nullable(),
  })).max(50, "Maximum 50 blocks allowed").optional(),
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
    backgroundImage: z.string().optional().nullable(),
  }).optional(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  showBranding: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  // M5: Slug uses validated schema
  slug: SlugSchema.optional(),
  customDomainId: z.string().uuid().optional().nullable(),
  themeId: z.string().optional().nullable(),
  // P6: Client sends its local updatedAt for conflict detection
  updatedAt: z.string().datetime().optional(),
  // Multi-bio: client tells us which gallery to update. Optional so
  // legacy single-bio clients (no `id` payload) keep working — those
  // fall back to the user's first gallery row.
  id: z.string().uuid().optional(),
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

      // Limit is not enforced on auto-creation — only on explicit publish (PATCH).
      // This prevents browsing to the gallery page from consuming a quota slot.

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

    // Load blocks and hydrate position from config
    const rows = await db
      .select()
      .from(linkGalleryBlocks)
      .where(eq(linkGalleryBlocks.galleryId, gallery!.id))
      .orderBy(linkGalleryBlocks.sortOrder);

    const blocks = rows.map((r) => {
      const config = { ...(r.config as Record<string, unknown>) };
      const position = config.__position as { x: number; y: number; w: number; h: number; static?: boolean } | undefined;
      const theme = config.__theme as Record<string, unknown> | undefined;
      delete config.__position;
      delete config.__theme;
      return { ...r, config, position: position ?? null, theme: theme ?? null };
    });

    return NextResponse.json({ gallery: { ...gallery, blocks }, domains: verifiedDomains });
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

    const rateLimit = await rateLimitByUser(dbUser.id, "update:gallery", 30, 60);
    if (rateLimit) return rateLimit;

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const existing = parsed.data.id
      ? await db.query.linkGallery.findFirst({
          where: (g, { eq, and }) =>
            and(eq(g.id, parsed.data.id!), eq(g.userId, dbUser.id)),
        })
      : await db.query.linkGallery.findFirst({
          where: (g, { eq }) => eq(g.userId, dbUser.id),
        });
    if (!existing) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

    // Enforce plan limit on publish (isPublished going from false → true)
    if (parsed.data.isPublished === true && !existing.isPublished) {
      const limitCheck = await checkLimit(existing.workspaceId, 'bioPages', false);
      if (!limitCheck.allowed) {
        return billingLimitError('bioPages', limitCheck.current, limitCheck.limit, 'free');
      }
    }

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

    // Strip the client-side updatedAt + the id selector before writing to DB
    const {
      updatedAt: _clientTs,
      blocks: blocksData,
      id: _galleryIdSelector,
      ...rawDataToSave
    } = parsed.data;

    // Only include fields the client actually sent — passing `undefined`
    // to Drizzle's `.set()` can write NULL into NOT NULL columns.
    const dataToSave: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawDataToSave)) {
      if (v !== undefined) dataToSave[k] = v;
    }

    // Built-in theme IDs are non-UUID strings (e.g. "theme-default") and
    // can't be stored in the `theme_id` uuid column. Persist NULL for
    // built-ins; the UI resolves NULL → Default theme on read.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if ("themeId" in dataToSave) {
      const t = dataToSave.themeId;
      if (typeof t !== "string" || !UUID_RE.test(t)) {
        dataToSave.themeId = null;
      }
    }

    const [updated] = await db
      .update(linkGallery)
      .set({ ...dataToSave, updatedAt: new Date() })
      .where(eq(linkGallery.id, existing.id))
      .returning();

    // Save blocks if provided — delete all existing and re-insert.
    // We preserve client-supplied UUIDs when present so block IDs stay
    // stable across saves (analytics, asset linking, etc. depend on this).
    let savedBlocks: Array<typeof linkGalleryBlocks.$inferSelect> | null = null;
    if (blocksData) {
      await db.delete(linkGalleryBlocks).where(eq(linkGalleryBlocks.galleryId, existing.id));

      if (blocksData.length > 0) {
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        savedBlocks = await db.insert(linkGalleryBlocks).values(
          blocksData.map((block, index) => {
            const config: Record<string, unknown> = (block.config ?? {}) as Record<string, unknown>;
            if (block.position) config.__position = block.position;
            if (block.theme) config.__theme = block.theme;
            // Only forward client-supplied id if it's a valid UUID — nanoids
            // and other formats fall back to PG's gen_random_uuid().
            const idIsUuid = typeof block.id === "string" && UUID_RE.test(block.id);
            // Coerce integrationId to either a valid UUID string or null.
            // Drizzle passes raw undefined through as an empty positional
            // parameter which pg parses as the wrong type → 500. Empty
            // strings would also fail the uuid column check.
            const safeIntegrationId =
              typeof block.integrationId === "string" && UUID_RE.test(block.integrationId)
                ? block.integrationId
                : null;
            return {
              ...(idIsUuid ? { id: block.id } : {}),
              galleryId: existing.id,
              type: block.type,
              sortOrder: block.sortOrder ?? index,
              config,
              data: (block.data ?? {}) as Record<string, unknown>,
              visible: block.visible ?? true,
              integrationId: safeIntegrationId,
            };
          })
        ).returning();
      } else {
        savedBlocks = [];
      }
    }

    // ── CF KV: purge cached HTML + sync domain mapping (non-blocking) ──────────
    // We still purge the CF Worker cache because if a user is unpublishing
    // through other paths or if a published_snapshot is later regenerated,
    // having a stale Worker copy is worse than a cache miss.
    //
    // Crucially we do NOT call `revalidatePath('/p/' + slug)` here — that
    // would push autosaved draft edits live. The only paths that should
    // invalidate the published page are POST /publish (toggle) and
    // POST /publish-content ("Update content"). PATCH is draft-only.
    const oldSlug = existing.slug !== updated.slug ? existing.slug : undefined;
    void purgeBioCache(updated.slug, oldSlug);

    // Resolve custom domain string if customDomainId changed
    if (parsed.data.customDomainId !== undefined) {
      const newDomainId = parsed.data.customDomainId;
      const oldDomainId = existing.customDomainId;

      if (newDomainId !== oldDomainId) {
        // Look up domain strings for both old and new IDs
        const [newDomainRow, oldDomainRow] = await Promise.all([
          newDomainId
            ? db.query.domains.findFirst({ where: (d, { eq }) => eq(d.id, newDomainId), columns: { domain: true } })
            : Promise.resolve(null),
          oldDomainId
            ? db.query.domains.findFirst({ where: (d, { eq }) => eq(d.id, oldDomainId), columns: { domain: true } })
            : Promise.resolve(null),
        ]);
        void syncDomainMapping(
          newDomainRow?.domain ?? null,
          updated.slug,
          updated.id,
          oldDomainRow?.domain ?? null,
        );
      }
    }

    return NextResponse.json({ gallery: updated, blocks: savedBlocks ?? undefined });
  } catch (err) {
    console.error("[PATCH /api/gallery]", err);

    // Extract the most useful debugging info up front. pg/Drizzle attach
    // helpful fields (`code`, `detail`, `constraint`, `column`) on the
    // `cause` of the wrapped error — those tell us why the SQL failed.
    const errAny = err as Record<string, unknown>;
    const causeAny = (errAny?.cause as Record<string, unknown>) ?? {};
    const message = err instanceof Error ? err.message : "unknown";

    const summaryParts: string[] = [];
    if (causeAny.code) summaryParts.push(`code=${causeAny.code}`);
    if (causeAny.detail) summaryParts.push(`detail=${causeAny.detail}`);
    if (causeAny.constraint) summaryParts.push(`constraint=${causeAny.constraint}`);
    if (causeAny.column) summaryParts.push(`column=${causeAny.column}`);
    if (causeAny.message) summaryParts.push(`msg=${causeAny.message}`);

    // Lead with cause info (short and actionable). Fall back to a
    // truncated message when there's no `cause` attached.
    const detail =
      summaryParts.length > 0
        ? summaryParts.join(", ").slice(0, 1000)
        : message.slice(0, 800);

    return NextResponse.json(
      { error: "Failed to update gallery", detail },
      { status: 500 }
    );
  }
}

// ─── CF KV cache invalidation helper ─────────────────────────────────────────

/**
 * Purge the bio page HTML + OG image from Cloudflare KV after every save.
 * Non-blocking — failures are logged but never surface to the user.
 */
async function purgeBioCache(slug: string, oldSlug?: string): Promise<void> {
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return;

  try {
    await fetch(`${workerUrl}/internal/bio/purge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": workerSecret,
      },
      body: JSON.stringify({ slug, oldSlug }),
    });
  } catch (err) {
    console.warn("[purgeBioCache] Failed (non-blocking):", err);
  }
}

/**
 * Write or remove a custom domain → slug mapping in Cloudflare KV.
 * Called when the user sets/clears customDomainId on their bio page.
 */
async function syncDomainMapping(
  domain: string | null,
  slug: string,
  galleryId: string,
  oldDomain?: string | null,
): Promise<void> {
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return;

  try {
    // Remove old domain mapping if domain changed
    if (oldDomain && oldDomain !== domain) {
      await fetch(`${workerUrl}/internal/bio/domain-mapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": workerSecret,
        },
        body: JSON.stringify({ domain: oldDomain, remove: true }),
      });
    }

    // Set new domain mapping
    if (domain) {
      await fetch(`${workerUrl}/internal/bio/domain-mapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": workerSecret,
        },
        body: JSON.stringify({ domain, slug, galleryId }),
      });
    }
  } catch (err) {
    console.warn("[syncDomainMapping] Failed (non-blocking):", err);
  }
}
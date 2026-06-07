import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getOrCreateDbUser } from "@/lib/auth";
import { trackLinkCreated } from "@/lib/posthog";
import { getDefaultDomain, getQrDomain } from "@/lib/utils";
import { checkLimit, getEffectiveLimits } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";
import { rateLimitByUser } from "@/lib/rate-limiter";
import { sendWebhookEvent } from "@/lib/svix/send";
import { startSafetyScan } from "@/lib/cloudflare/link-safety";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { domains, users } from "@/lib/db/schema";
import { sendFirstLinkCreatedEmail } from "@/lib/email";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import { eq, sql, and, isNull, ilike, or, desc, count } from "drizzle-orm";
const CreateLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional().or(z.literal("")),
  domainId: z.string().uuid().optional().nullable(),
  title: z.string().max(200).optional().nullable().or(z.literal("")),
  description: z.string().max(500).optional().nullable().or(z.literal("")),
  password: z.string().max(64).optional().nullable().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional().nullable().or(z.literal("")),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal("")),
  scheduledAt: z.string().datetime().optional().nullable().or(z.literal("")),
  clickLimit: z.number().int().positive().optional().nullable(),
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  utmSource: z.string().max(120).optional().nullable().or(z.literal("")),
  utmMedium: z.string().max(120).optional().nullable().or(z.literal("")),
  utmCampaign: z.string().max(120).optional().nullable().or(z.literal("")),
  utmTerm: z.string().max(120).optional().nullable().or(z.literal("")),
  utmContent: z.string().max(120).optional().nullable().or(z.literal("")),
  ogTitle: z.string().max(200).optional().nullable().or(z.literal("")),
  ogDescription: z.string().max(500).optional().nullable().or(z.literal("")),
  ogImage: z.string().url().optional().nullable().or(z.literal("")),
  iosDestination: z.string().url().optional().nullable().or(z.literal("")),
  androidDestination: z.string().url().optional().nullable().or(z.literal("")),
  uriScheme: z.string().max(500).optional().nullable().or(z.literal("")),
  iosAppStoreId: z.string().max(100).optional().nullable().or(z.literal("")),
  androidPlayStoreId: z.string().max(100).optional().nullable().or(z.literal("")),
  iosBundleId: z.string().max(200).optional().nullable().or(z.literal("")),
  androidPackageName: z.string().max(200).optional().nullable().or(z.literal("")),
  sha256CertFingerprints: z.array(z.string()).optional(),
  universalLinksEnabled: z.boolean().optional(),
  appLinksEnabled: z.boolean().optional(),
  abTestEnabled: z.boolean().optional(),
  abTestVariants: z
    .array(
      z.object({
        destination: z.string().url(),
        weight: z.number().int().positive(),
        label: z.string().optional(),
      })
    )
    .optional(),
  routingRules: z
    .array(
      z.object({
        condition: z.object({
          device: z.enum(["mobile", "desktop", "tablet"]).optional(),
          country: z.string().optional(),
          language: z.string().optional(),
        }),
        destination: z.string().url(),
      })
    )
    .optional(),
});



function emptyToNull<T extends string | undefined | null>(v: T): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

// GET /api/links — list user's links scoped to workspace with server-side search & pagination
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const folderId = searchParams.get("folderId");
    const tags = searchParams.get("tags");
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);

    // Build dynamic query conditions using Drizzle ORM
    let conditions = [eq(links.workspaceId, ws.id)];

    // Folder filter
    if (folderId === "none") {
      conditions.push(isNull(links.folderId));
    } else if (folderId && folderId !== "") {
      conditions.push(eq(links.folderId, folderId));
    }

    // Search filter using ILIKE
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(links.slug, searchPattern),
          ilike(links.destination, searchPattern),
          ilike(links.title, searchPattern),
          ilike(links.description, searchPattern)
        )!
      );
    }

    // Tags filter (handled separately due to array column)
    const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Build where clause
    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(links)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);

    // Get paginated results (include domain relation so the frontend can
    // build short URLs using the link's custom domain when one is assigned)
    let userLinks = await db.query.links.findMany({
      where: whereClause,
      orderBy: [desc(links.createdAt)],
      limit,
      offset,
      with: { domain: { columns: { domain: true } } },
    });

    // Filter by tags on server-side (PostgreSQL array overlap)
    if (tagList.length > 0) {
      userLinks = userLinks.filter((link) =>
        tagList.some((tag) => link.tags?.includes(tag))
      );
    }

    return NextResponse.json({
      links: userLinks,
      workspaceId: ws.id,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/links]", err);
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}

// POST /api/links — create a new short link
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const rateLimit = await rateLimitByUser(dbUser.id, "create:link", 10, 60);
    if (rateLimit) return rateLimit;

    const body = await req.json();
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstField = Object.entries(flat.fieldErrors)[0];
      const msg = firstField ? `${firstField[0]}: ${firstField[1][0]}` : "Validation failed";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const v = parsed.data;
    const slug = (v.slug && v.slug.trim().length > 0) ? v.slug.trim() : nanoid(7);

    // Validate workspace membership and write permission
    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, v.workspaceId);
      if (!canWrite(ws.role)) {
        return NextResponse.json({ error: "You don't have permission to create links in this workspace" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    const limits = await getEffectiveLimits(v.workspaceId);
    if (v.abTestEnabled && !limits.abTestingEnabled) {
      return NextResponse.json({
        success: false,
        error: { code: 'FEATURE_NOT_AVAILABLE', feature: 'abTesting', upgradeTo: 'growth' }
      }, { status: 402 });
    }

    const limitCheck = await checkLimit(v.workspaceId, 'linksPerMonth', false);
    if (!limitCheck.allowed) {
      return billingLimitError('linksPerMonth', limitCheck.current, limitCheck.limit, ws.plan);
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (v.password && v.password.trim() !== "") {
      hashedPassword = await bcrypt.hash(v.password, 10);
    }

    // ── Resolve effective custom domain (custom-domain-assignment Req 2) ──────
    // Explicit domainId wins; otherwise fall back to the workspace's verified
    // default domain when one is set. NULL → served from the global namespace.
    let domainId: string | null = v.domainId ?? null;
    if (domainId === null) {
      const def = await db.query.domains.findFirst({
        where: (d, { eq, and }) =>
          and(eq(d.workspaceId, v.workspaceId), eq(d.isDefault, true), eq(d.verified, true)),
        columns: { id: true },
      });
      domainId = def?.id ?? null;
    }

    if (domainId) {
      const dom = await db.query.domains.findFirst({ where: eq(domains.id, domainId) });
      if (!dom || dom.workspaceId !== v.workspaceId) {
        return NextResponse.json({ error: { code: "DOMAIN_NOT_FOUND" } }, { status: 400 });
      }
      if (!dom.verified) {
        return NextResponse.json({ error: { code: "DOMAIN_NOT_VERIFIED" } }, { status: 400 });
      }
      if (dom.role === "bio") {
        if (v.domainId) {
          // User explicitly chose this bio domain — reject
          return NextResponse.json({ error: { code: "ROLE_DISALLOWS_LINKS" } }, { status: 409 });
        }
        // Auto-resolved default domain is for bio only — fall through to
        // the global namespace so link creation doesn't fail silently.
        domainId = null;
      } else {
        // Reserved system/route slugs may never be a custom-domain short link
        if (isReservedSlug(slug)) {
          return NextResponse.json({
            error: { code: "SLUG_RESERVED", message: "This path is reserved on this domain. Choose a different slug." },
          }, { status: 409 });
        }
      }
    }

    // Slug uniqueness scoped to the domain (custom-domain-assignment Req 2.4):
    // (domainId, slug) for custom domains, (NULL, slug) for the global namespace.
    const existing = await db.query.links.findFirst({
      where: (l, { eq, and, isNull }) =>
        and(eq(l.slug, slug), domainId ? eq(l.domainId, domainId) : isNull(l.domainId)),
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: domainId ? "SLUG_TAKEN_ON_DOMAIN" : "SLUG_TAKEN", message: "Slug already taken" } },
        { status: 409 }
      );
    }

    const [link] = await db
      .insert(links)
      .values({
        userId: dbUser.id,
        workspaceId: v.workspaceId,
        domainId,
        slug,
        destination: v.destination,
        title: emptyToNull(v.title),
        description: emptyToNull(v.description),
        tags: v.tags ?? [],
        folderId: v.folderId && v.folderId !== "" ? v.folderId : null,
        password: hashedPassword,
        expiresAt: v.expiresAt && v.expiresAt !== "" ? new Date(v.expiresAt) : null,
        scheduledAt: v.scheduledAt && v.scheduledAt !== "" ? new Date(v.scheduledAt) : null,
        clickLimit: v.clickLimit ?? null,
        utmSource: emptyToNull(v.utmSource),
        utmMedium: emptyToNull(v.utmMedium),
        utmCampaign: emptyToNull(v.utmCampaign),
        utmTerm: emptyToNull(v.utmTerm),
        utmContent: emptyToNull(v.utmContent),
        ogTitle: emptyToNull(v.ogTitle),
        ogDescription: emptyToNull(v.ogDescription),
        ogImage: emptyToNull(v.ogImage),
        iosDestination: emptyToNull(v.iosDestination),
        androidDestination: emptyToNull(v.androidDestination),
        uriScheme: emptyToNull(v.uriScheme),
        iosAppStoreId: emptyToNull(v.iosAppStoreId),
        androidPlayStoreId: emptyToNull(v.androidPlayStoreId),
        iosBundleId: emptyToNull(v.iosBundleId),
        androidPackageName: emptyToNull(v.androidPackageName),
        sha256CertFingerprints: v.sha256CertFingerprints ?? [],
        universalLinksEnabled: v.universalLinksEnabled ?? false,
        appLinksEnabled: v.appLinksEnabled ?? false,
        abTestEnabled: v.abTestEnabled ?? false,
        abTestVariants: v.abTestVariants
          ? v.abTestVariants.map((av) => ({
              id: crypto.randomUUID(),
              destination: av.destination,
              weight: av.weight,
              label: av.label ?? `Variant ${String.fromCharCode(64 + (v.abTestVariants?.indexOf(av) ?? 0) + 1)}`,
              clicks: 0,
              conversions: 0,
              conversionRate: 0,
              uniqueClicks: 0,
            }))
          : null,
        routingRules: v.routingRules ?? null,
        // Seed QR settings with the default so /dashboard/qr and every
        // preview in the app have a single source of truth to read from
        // (link.qrSettings). Without this, the new link would render with
        // null settings and every consumer would need its own fallback.
        qrSettings: DEFAULT_QR_SETTINGS,
      })
      .returning();

    // Cache in Redis (fire-and-forget)
    redis.set(`link:${slug}`, v.destination, { ex: 60 * 60 * 24 * 30 }).catch(() => {});

    // ── Cloudflare URL Scanner: auto-scan destination (fire-and-forget) ───
    // Non-blocking. The scan submission writes `safety_status = 'pending'`
    // and the scan UUID onto the link row. The /dashboard/link-safety page
    // (and the /s/[slug] redirect) consult this status. Until a verdict is
    // in, the link stays `pending` — it still works, but is flagged for
    // review on the safety dashboard. Once the scan resolves, redirects
    // for malicious destinations are blocked by an interstitial.
    void startSafetyScan(link.id, v.destination);

    // Increment usage counter (fire-and-forget)
    checkLimit(v.workspaceId, 'linksPerMonth', true).catch(() => {});

    // PostHog + audit (fire-and-forget)
    const domain = getDefaultDomain();
    await trackLinkCreated({
      linkId: link.id,
      domain,
      hasCustomSlug: !!v.slug && v.slug.trim().length > 0,
      hasUTM: !!(v.utmSource || v.utmMedium || v.utmCampaign || v.utmTerm || v.utmContent),
    });
    logAudit({
      workspaceId: v.workspaceId,
      actorId: dbUser.id,
      action: "create",
      entityType: "link",
      entityId: link.id,
      metadata: { slug, domain },
    });

    sendWebhookEvent({
      eventType: "link.created",
      workspaceId: v.workspaceId,
      data: {
        linkId: link.id,
        slug,
        destination: v.destination,
        domain,
        title: v.title ?? null,
        tags: v.tags ?? [],
        utmSource: v.utmSource ?? null,
        utmMedium: v.utmMedium ?? null,
        utmCampaign: v.utmCampaign ?? null,
        utmTerm: v.utmTerm ?? null,
        utmContent: v.utmContent ?? null,
        abTestEnabled: v.abTestEnabled ?? false,
        hasExpiry: !!(v.expiresAt && v.expiresAt !== ""),
        hasClickLimit: !!v.clickLimit,
        hasPassword: !!(v.password && v.password.trim() !== ""),
        hasSmartRouting: !!(v.routingRules && v.routingRules.length > 0),
      },
      actorId: dbUser.id,
      idempotencyKey: `link.created-${link.id}`,
    });

    // ── First link celebration ─────────────────────────────────────────────
    if (dbUser?.email) {
      const linkCount = await db
        .select({ count: count() })
        .from(links)
        .where(eq(links.workspaceId, v.workspaceId));
      if (Number(linkCount[0]?.count ?? 0) === 1) {
        sendFirstLinkCreatedEmail(dbUser.email, {
          name: dbUser.name || dbUser.email,
          linkTitle: v.title || slug,
          linkSlug: slug,
          dashboardUrl: `https://${getDefaultDomain()}/dashboard/links`,
        }).catch(() => {});
      }
    }

    // Build the public short URL. When the link has a custom domain the
    // short URL is `https://{customDomain}/{slug}` (no /s/ prefix) so the
    // Cloudflare Worker routes it directly. Otherwise fall back to the
    // default domain with the /s/ prefix.
    let shortDomain: string;
    let shortUrl: string;

    if (domainId) {
      // Re-fetch the domain row to get the hostname
      const dom = await db.query.domains.findFirst({
        where: eq(domains.id, domainId),
        columns: { domain: true },
      });
      shortDomain = dom?.domain ?? getDefaultDomain();
      shortUrl = `https://${shortDomain}/${slug}`;
    } else {
      shortDomain = getDefaultDomain();
      shortUrl = `https://${shortDomain}/s/${slug}`;
    }
    const qrUrl = `https://${getQrDomain()}/s/${slug}?source=qr`;

    return NextResponse.json(
      {
        link,
        id: link.id,
        shortSlug: slug,
        shortDomain,
        shortUrl,
        qrUrl,
        customDomain: domainId ? shortDomain : null,
        // Echo the persisted QR settings so the success card in the link
        // creator and the page on /dashboard/qr render the exact same QR.
        qrSettings: link.qrSettings ?? DEFAULT_QR_SETTINGS,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/links]", err);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

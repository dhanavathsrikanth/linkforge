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
import { getDefaultDomain } from "@/lib/utils";
import { checkLimit, getEffectiveLimits } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";
const CreateLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional().or(z.literal("")),
  title: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  password: z.string().max(64).optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  scheduledAt: z.string().datetime().optional().or(z.literal("")),
  clickLimit: z.number().int().positive().optional().nullable(),
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  utmSource: z.string().max(120).optional().or(z.literal("")),
  utmMedium: z.string().max(120).optional().or(z.literal("")),
  utmCampaign: z.string().max(120).optional().or(z.literal("")),
  utmTerm: z.string().max(120).optional().or(z.literal("")),
  utmContent: z.string().max(120).optional().or(z.literal("")),
  ogTitle: z.string().max(200).optional().or(z.literal("")),
  ogDescription: z.string().max(500).optional().or(z.literal("")),
  ogImage: z.string().url().optional().or(z.literal("")),
  iosDestination: z.string().url().optional().or(z.literal("")),
  androidDestination: z.string().url().optional().or(z.literal("")),
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

// GET /api/links — list user's links scoped to workspace
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);

    const userLinks = await db.query.links.findMany({
      where: (l, { eq }) => eq(l.workspaceId, ws.id),
      orderBy: (l, { desc }) => [desc(l.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ links: userLinks, workspaceId: ws.id });
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

    const body = await req.json();
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
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

    // Check slug uniqueness
    const existing = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.slug, slug),
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }

    const [link] = await db
      .insert(links)
      .values({
        userId: dbUser.id,
        workspaceId: v.workspaceId,
        slug,
        destination: v.destination,
        title: emptyToNull(v.title),
        description: emptyToNull(v.description),
        tags: v.tags ?? [],
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
      })
      .returning();

    // Cache in Redis (fire-and-forget)
    redis.set(`link:${slug}`, v.destination, { ex: 60 * 60 * 24 * 30 }).catch(() => {});

    // Increment usage counter (fire-and-forget)
    checkLimit(v.workspaceId, 'linksPerMonth', true).catch(() => {});

    // PostHog + audit (fire-and-forget)
    const domain = getDefaultDomain();
    trackLinkCreated({
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

    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/links]", err);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

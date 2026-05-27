import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, workspaces } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { corsHeaders, addCors } from "@/lib/cors";
import { checkLimit, getEffectiveLimits } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { redis } from "@/lib/redis";
import { eq, desc, like, and, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  password: z.string().max(64).optional(),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  clickLimit: z.number().int().positive().optional().nullable(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImage: z.string().url().optional(),
  iosDestination: z.string().url().optional(),
  androidDestination: z.string().url().optional(),
  uriScheme: z.string().max(500).optional(),
  iosAppStoreId: z.string().max(100).optional(),
  androidPlayStoreId: z.string().max(100).optional(),
  iosBundleId: z.string().max(200).optional(),
  androidPackageName: z.string().max(200).optional(),
  sha256CertFingerprints: z.array(z.string()).optional(),
  universalLinksEnabled: z.boolean().optional(),
  appLinksEnabled: z.boolean().optional(),
  abTestEnabled: z.boolean().optional(),
  abTestVariants: z
    .array(
      z.object({
        destination: z.string(),
        weight: z.number().min(1).max(100),
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
        destination: z.string(),
      })
    )
    .optional(),
});

function emptyToNull<T extends string | undefined | null>(v: T): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const orderColumn = sortBy === "totalClicks" ? links.totalClicks
    : sortBy === "slug" ? links.slug
    : links.createdAt;

  const orderFn = sortOrder === "asc" ? sql`${orderColumn} asc` : sql`${orderColumn} desc`;

  const whereClause = search
    ? and(
        eq(links.workspaceId, auth.workspaceId),
        or(
          like(links.slug, `%${search}%`),
          like(links.title, `%${search}%`),
          like(links.destination, `%${search}%`)
        )
      )
    : eq(links.workspaceId, auth.workspaceId);

  const [allLinks, [{ count }]] = await Promise.all([
    db
      .select()
      .from(links)
      .where(whereClause)
      .orderBy(orderFn)
      .offset(offset)
      .limit(limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(links)
      .where(whereClause),
  ]);

  return addCors(NextResponse.json({
    data: allLinks,
    meta: { total: count, offset, limit },
  }));
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return addCors(NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot create links." } },
      { status: 403 }
    ));
  }

  try {
    const body = await request.json();
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return addCors(NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      ));
    }

    const v = parsed.data;
    const slug = v.slug && v.slug.trim().length > 0 ? v.slug.trim() : nanoid(7);

    const ws = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, auth.workspaceId),
    });
    if (!ws) {
      return addCors(NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Workspace not found." } },
        { status: 404 }
      ));
    }

    const limits = await getEffectiveLimits(auth.workspaceId);
    if (v.abTestEnabled && !limits.abTestingEnabled) {
      return addCors(NextResponse.json({
        error: { code: "FEATURE_NOT_AVAILABLE", message: "A/B testing requires the Growth plan or above.", upgradeTo: "growth" },
      }, { status: 402 }));
    }

    const limitCheck = await checkLimit(auth.workspaceId, "linksPerMonth", false);
    if (!limitCheck.allowed) {
      return addCors(billingLimitError("linksPerMonth", limitCheck.current, limitCheck.limit, ws.plan));
    }

    let hashedPassword: string | null = null;
    if (v.password && v.password.trim() !== "") {
      hashedPassword = await bcrypt.hash(v.password, 10);
    }

    const existing = await db.query.links.findFirst({
      where: eq(links.slug, slug),
    });
    if (existing) {
      return addCors(NextResponse.json(
        { error: { code: "CONFLICT", message: "Slug already taken." } },
        { status: 409 }
      ));
    }

    const [link] = await db
      .insert(links)
      .values({
        workspaceId: auth.workspaceId,
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
      })
      .returning();

    try {
      await redis.set(`link:${slug}`, v.destination, { ex: 60 * 60 * 24 * 30 });
    } catch {
      // best-effort
    }

    try {
      await checkLimit(auth.workspaceId, "linksPerMonth", true);
    } catch {
      // best-effort
    }

    return addCors(NextResponse.json({ data: link }, { status: 201 }));
  } catch (err) {
    console.error("[POST /api/v2/links]", err);
    return addCors(NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create link." } },
      { status: 500 }
    ));
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
}

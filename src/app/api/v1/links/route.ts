import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
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
  tags: z.array(z.string()).optional(),
  domain: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  clickLimit: z.number().int().positive().optional().nullable(),
  password: z.string().max(64).optional(),
  utm: z.object({
    source: z.string().max(120).optional(),
    medium: z.string().max(120).optional(),
    campaign: z.string().max(120).optional(),
    term: z.string().max(120).optional(),
    content: z.string().max(120).optional(),
  }).optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variants: z.array(z.object({
      destination: z.string(),
      weight: z.number().min(1).max(100),
      label: z.string(),
    })),
  }).optional(),
  smartRouting: z.object({
    ios: z.string().url().optional(),
    android: z.string().url().optional(),
    geo: z.record(z.string()).optional(),
  }).optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const sortBy = searchParams.get("sortBy") || "created";
  const order = searchParams.get("order") || "desc";
  const isActive = searchParams.get("isActive");

  const offset = (page - 1) * limit;

  const orderColumn = sortBy === "clicks" ? links.totalClicks
    : sortBy === "updated" ? links.updatedAt
    : links.createdAt;

  const orderFn = order === "asc" ? sql`${orderColumn} asc` : sql`${orderColumn} desc`;

  const conditions: ReturnType<typeof and>[] = [eq(links.workspaceId, auth.workspaceId)];
  if (search) {
    conditions.push(
      or(
        like(links.slug, `%${search}%`),
        like(links.title, `%${search}%`),
        like(links.destination, `%${search}%`)
      )
    );
  }
  if (tag) {
    conditions.push(sql`${links.tags} ? ${tag}`);
  }
  if (isActive === "true") conditions.push(eq(links.isActive, true));
  if (isActive === "false") conditions.push(eq(links.isActive, false));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [allLinks, [{ count }]] = await Promise.all([
    db.select().from(links).where(whereClause).orderBy(orderFn).offset(offset).limit(limit),
    db.select({ count: sql<number>`count(*)::int` }).from(links).where(whereClause),
  ]);

  return NextResponse.json({
    data: {
      links: allLinks,
      total: count,
      page,
      limit,
      hasMore: offset + limit < count,
    },
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot create links." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const slug = v.slug?.trim() || nanoid(7);

    const ws = await db.query.workspaces.findFirst({
      where: eq(sql`id`, auth.workspaceId),
    });
    if (!ws) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Workspace not found." } },
        { status: 404 }
      );
    }

    if (v.abTest?.enabled) {
      const limits = await getEffectiveLimits(auth.workspaceId);
      if (!limits.abTestingEnabled) {
        return NextResponse.json({
          error: { code: "FEATURE_NOT_AVAILABLE", message: "A/B testing requires the Growth plan or above." },
        }, { status: 402 });
      }
    }

    const limitCheck = await checkLimit(auth.workspaceId, "linksPerMonth", false);
    if (!limitCheck.allowed) {
      return billingLimitError("linksPerMonth", limitCheck.current, limitCheck.limit, ws.plan);
    }

    let hashedPassword: string | null = null;
    if (v.password) {
      hashedPassword = await bcrypt.hash(v.password, 10);
    }

    const existing = await db.query.links.findFirst({
      where: eq(links.slug, slug),
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Slug already taken." } },
        { status: 409 }
      );
    }

    const [link] = await db
      .insert(links)
      .values({
        workspaceId: auth.workspaceId,
        slug,
        destination: v.destination,
        title: v.title ?? null,
        tags: v.tags ?? [],
        password: hashedPassword,
        expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
        clickLimit: v.clickLimit ?? null,
        utmSource: v.utm?.source ?? null,
        utmMedium: v.utm?.medium ?? null,
        utmCampaign: v.utm?.campaign ?? null,
        utmTerm: v.utm?.term ?? null,
        utmContent: v.utm?.content ?? null,
        iosDestination: v.smartRouting?.ios ?? null,
        androidDestination: v.smartRouting?.android ?? null,
        geoRouting: v.smartRouting?.geo ?? null,
        abTestEnabled: v.abTest?.enabled ?? false,
        abTestVariants: v.abTest?.variants
          ? v.abTest.variants.map((av, i) => ({
              id: crypto.randomUUID(),
              destination: av.destination,
              weight: av.weight,
              label: av.label || `Variant ${String.fromCharCode(65 + i)}`,
              clicks: 0,
              conversions: 0,
              conversionRate: 0,
              uniqueClicks: 0,
            }))
          : null,
      })
      .returning();

    try {
      await redis.set(`link:${slug}`, v.destination, { ex: 60 * 60 * 24 * 30 });
    } catch {}

    try {
      await checkLimit(auth.workspaceId, "linksPerMonth", true);
    } catch {}

    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/links]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create link." } },
      { status: 500 }
    );
  }
}

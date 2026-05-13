import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links, domains, workspaces } from "@/lib/db";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getOrCreateDbUser } from "@/lib/auth";
import { trackLinkCreated } from "@/lib/posthog";
import { eq, sql } from "drizzle-orm";
import { incrementUsage } from "@/lib/billing/usage";

const CreateLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional().or(z.literal("")),
  title: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  password: z.string().max(64).optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
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
});

const PLAN_LIMITS: Record<string, { links: number | "unlimited"; domains: number | "unlimited" }> = {
  free: { links: 500, domains: 1 },
  starter: { links: 5000, domains: 2 },
  growth: { links: 25000, domains: 5 },
  agency: { links: "unlimited", domains: 15 },
  business: { links: "unlimited", domains: 25 },
  enterprise: { links: "unlimited", domains: 50 },
};

function resolvePlanLimits(plan?: string) {
  const key = (plan || "free").toLowerCase();
  return PLAN_LIMITS[key] || PLAN_LIMITS["free"];
}

function emptyToNull<T extends string | undefined | null>(v: T): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

// GET /api/links — list user's links (in their workspaces)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const userLinks = await db.query.links.findMany({
      where: (l, { eq }) => eq(l.userId, dbUser.id),
      orderBy: (l, { desc }) => [desc(l.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ links: userLinks });
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

    // Enforce plan link limits (total links per workspace)
    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, v.workspaceId) });
    if (!ws) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const planLimits = resolvePlanLimits(ws.plan);
    if (planLimits.links !== "unlimited") {
      const [{ count: totalLinks }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(links)
        .where(eq(links.workspaceId, v.workspaceId));
      if (totalLinks >= (planLimits.links as number)) {
        return NextResponse.json(
          {
            code: "PLAN_LIMIT_REACHED",
            limit: "links",
            current: totalLinks,
            max: planLimits.links,
            upgradeUrl: "/pricing",
          },
          { status: 403 }
        );
      }
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
      })
      .returning();

    // Cache in Redis for edge worker (best-effort)
    try {
      await redis.set(`link:${slug}`, v.destination, { ex: 60 * 60 * 24 * 30 });
    } catch (cacheErr) {
      console.warn("[POST /api/links] redis cache failed", cacheErr);
    }

    // Increment monthly usage counter
    try {
      await incrementUsage(v.workspaceId, "linksCreated", 1);
    } catch (e) {
      console.warn("[POST /api/links] increment usage failed", e);
    }

    // Track link creation in PostHog (non-blocking, best effort)
    // Get domain info from the created link
    const linkWithDomain = await db.query.links.findFirst({
      where: eq(links.id, link.id),
    });

    const domain = linkWithDomain?.domainId
      ? await db.query.domains.findFirst({
        where: eq(domains.id, linkWithDomain.domainId),
      })
      : null;

    trackLinkCreated({
      linkId: link.id,
      domain: domain?.domain || "linkforge.app",
      hasCustomSlug: !!v.slug && v.slug.trim().length > 0,
      hasUTM: !!(v.utmSource || v.utmMedium || v.utmCampaign || v.utmTerm || v.utmContent),
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/links]", err);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

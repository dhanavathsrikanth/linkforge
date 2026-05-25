import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { trackLinkCreated } from "@/lib/posthog";
import { getDefaultDomain } from "@/lib/utils";
import { checkLimit, getEffectiveLimits } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";

const BulkLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional().or(z.literal("")),
  title: z.string().max(200).optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  utmSource: z.string().max(120).optional().or(z.literal("")),
  utmMedium: z.string().max(120).optional().or(z.literal("")),
  utmCampaign: z.string().max(120).optional().or(z.literal("")),
  utmTerm: z.string().max(120).optional().or(z.literal("")),
  utmContent: z.string().max(120).optional().or(z.literal("")),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  clickLimit: z.number().int().positive().optional().nullable(),
  password: z.string().max(64).optional().or(z.literal("")),
});

const BulkCreateSchema = z.object({
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  links: z.array(BulkLinkSchema).min(1).max(500, "Maximum 500 links per batch"),
  utmSource: z.string().max(120).optional().or(z.literal("")),
  utmMedium: z.string().max(120).optional().or(z.literal("")),
  utmCampaign: z.string().max(120).optional().or(z.literal("")),
  utmTerm: z.string().max(120).optional().or(z.literal("")),
  utmContent: z.string().max(120).optional().or(z.literal("")),
});

function emptyToNull<T extends string | undefined | null>(v: T): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function pick<T>(a: T | undefined, b: T | undefined): T | undefined {
  return a !== undefined && a !== "" ? a : b;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json();
    const parsed = BulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

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
    if (!limits.bulkCreateEnabled) {
      return NextResponse.json({
        success: false,
        error: { code: "FEATURE_NOT_AVAILABLE", feature: "bulkCreate", upgradeTo: "growth" },
        message: "Bulk link creation requires the Growth plan or above.",
      }, { status: 402 });
    }

    const limitCheck = await checkLimit(v.workspaceId, "linksPerMonth", false);
    if (!limitCheck.allowed) {
      return billingLimitError("linksPerMonth", limitCheck.current, limitCheck.limit, ws.plan);
    }

    const domain = getDefaultDomain();
    const results: { index: number; success: boolean; link?: any; error?: string }[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < v.links.length; i++) {
      const item = v.links[i];
      try {
        const slug = item.slug && item.slug.trim().length > 0
          ? item.slug.trim()
          : nanoid(7);

        const utmSource = pick(item.utmSource, v.utmSource);
        const utmMedium = pick(item.utmMedium, v.utmMedium);
        const utmCampaign = pick(item.utmCampaign, v.utmCampaign);
        const utmTerm = pick(item.utmTerm, v.utmTerm);
        const utmContent = pick(item.utmContent, v.utmContent);

        const existing = await db.query.links.findFirst({
          where: (l, { eq }) => eq(l.slug, slug),
        });
        if (existing) {
          throw new Error(`Slug "${slug}" already taken`);
        }

        const [link] = await db
          .insert(links)
          .values({
            userId: dbUser.id,
            workspaceId: v.workspaceId,
            slug,
            destination: item.destination,
            title: emptyToNull(item.title),
            tags: item.tags ?? [],
            utmSource: emptyToNull(utmSource),
            utmMedium: emptyToNull(utmMedium),
            utmCampaign: emptyToNull(utmCampaign),
            utmTerm: emptyToNull(utmTerm),
            utmContent: emptyToNull(utmContent),
            expiresAt: item.expiresAt && item.expiresAt !== "" ? new Date(item.expiresAt) : null,
            clickLimit: item.clickLimit ?? null,
          })
          .returning();

        results.push({ index: i, success: true, link });
        succeeded++;

        try {
          await redis.set(`link:${slug}`, item.destination, { ex: 60 * 60 * 24 * 30 });
        } catch {}

        await trackLinkCreated({
          linkId: link.id,
          domain,
          hasCustomSlug: !!item.slug && item.slug.trim().length > 0,
          hasUTM: !!(utmSource || utmMedium || utmCampaign || utmTerm || utmContent),
        });
        logAudit({
          workspaceId: v.workspaceId,
          actorId: dbUser.id,
          action: "create",
          entityType: "link",
          entityId: link.id,
          metadata: { slug, domain, bulk: true },
        });
      } catch (err: any) {
        results.push({ index: i, success: false, error: err?.message || "Unknown error" });
        failed++;
      }
    }

    try {
      await checkLimit(v.workspaceId, "linksPerMonth", true);
    } catch {}

    return NextResponse.json({
      results,
      summary: { total: v.links.length, succeeded, failed },
    }, { status: failed > 0 && succeeded > 0 ? 207 : failed === v.links.length ? 422 : 201 });
  } catch (err) {
    console.error("[POST /api/links/bulk]", err);
    return NextResponse.json({ error: "Failed to create links" }, { status: 500 });
  }
}

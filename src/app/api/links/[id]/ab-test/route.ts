import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links, clicks, conversions, abTestResults } from "@/lib/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";
import { redis } from "@/lib/redis";
import { getEffectiveLimits } from "@/lib/billing/usage";
import { z } from "zod";
import { determineWinner } from "@/lib/ab-test/statistics";
import type { ABVariant, ABTestResult } from "@/types/ab-test";

const ABTestSchema = z.object({
  enabled: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        destination: z.string().url("Each variant must be a valid URL"),
        weight: z.number().min(1).max(99),
        label: z.string().min(1).max(50),
      })
    )
    .min(2, "Need at least 2 variants")
    .max(5, "Maximum 5 variants"),
  minimumSampleSize: z.number().min(50).max(10000).default(100),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  autoSelectWinner: z.boolean().default(true),
  testDurationDays: z.number().min(1).max(90).default(14),
});

async function getLink(id: string) {
  const link = await db.query.links.findFirst({ where: eq(links.id, id) });
  if (!link) return null;
  return link;
}

// GET /api/links/[id]/ab-test — fetch current config + live stats
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const link = await getLink(id);
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const ws = await resolveUserWorkspace(dbUser.id);
    if (link.workspaceId !== ws.id)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Auto-expire if test has exceeded duration
    let autoExpired = false;
    if (link.abTestEnabled && link.abTestStartedAt && !link.abTestEndedAt) {
      const durationDays = link.abTestDurationDays ?? 14;
      const deadline = new Date(link.abTestStartedAt);
      deadline.setDate(deadline.getDate() + durationDays);
      if (new Date() > deadline) {
        await db.update(links).set({ abTestEnabled: false, abTestEndedAt: new Date() }).where(eq(links.id, id));
        link.abTestEnabled = false;
        link.abTestEndedAt = new Date();
        autoExpired = true;
      }
    }

    // Aggregate live click data per variant from the clicks table
    const clickStats = await db
      .select({
        variant: clicks.abVariant,
        count: sql<number>`count(*)::int`,
        uniqueClicks: sql<number>`count(distinct ${clicks.ip})::int`,
      })
      .from(clicks)
      .where(and(eq(clicks.linkId, id), sql`${clicks.abVariant} is not null`))
      .groupBy(clicks.abVariant);

    // Aggregate real conversion data per variant from the conversions table
    const conversionStats = await db
      .select({
        variant: conversions.abVariant,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`coalesce(sum(${conversions.value}::numeric), 0)::int`,
      })
      .from(conversions)
      .where(and(eq(conversions.linkId, id), sql`${conversions.abVariant} is not null`))
      .groupBy(conversions.abVariant);

    // Merge click + conversion stats into the variant definitions
    const variants: ABVariant[] = (link.abTestVariants ?? []).map((v: any) => {
      const label = v.label || v.destination;
      const clickStat = clickStats.find((cs) => cs.variant === label);
      const convStat = conversionStats.find((cs) => cs.variant === label);
      const clicks_ = clickStat?.count ?? v.clicks ?? 0;
      const conversions_ = convStat?.count ?? v.conversions ?? 0;
      return {
        id: v.id || crypto.randomUUID(),
        destination: v.destination,
        weight: v.weight,
        label,
        clicks: clicks_,
        conversions: conversions_,
        conversionRate: clicks_ > 0 ? conversions_ / clicks_ : 0,
        uniqueClicks: clickStat?.uniqueClicks ?? v.uniqueClicks ?? 0,
      };
    });

    const result: ABTestResult | null =
      link.abTestEnabled && variants.length >= 2 ? determineWinner(variants) : null;

    return NextResponse.json({
      enabled: link.abTestEnabled,
      variants,
      winner: link.abTestWinner,
      significance: link.abTestSignificance,
      startedAt: link.abTestStartedAt,
      endedAt: link.abTestEndedAt,
      durationDays: link.abTestDurationDays ?? 14,
      minSampleSize: link.abTestMinSampleSize ?? 100,
      confidenceLevel: Number(link.abTestConfidenceLevel) || 0.95,
      autoSelectWinner: link.abTestAutoSelectWinner ?? true,
      autoExpired,
      result,
    });
  } catch (err) {
    console.error("[GET /api/links/[id]/ab-test]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/links/[id]/ab-test — create or update A/B test
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = ABTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;
    const link = await getLink(id);
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const ws = await resolveUserWorkspace(dbUser.id);
    if (link.workspaceId !== ws.id)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    if (!canWrite(ws.role))
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    // Plan gate
    const limits = await getEffectiveLimits(ws.id);
    if (v.enabled && !limits.abTestingEnabled) {
      return NextResponse.json(
        { error: { code: "FEATURE_NOT_AVAILABLE", message: "A/B testing requires the Growth plan or above.", upgradeTo: "growth" } },
        { status: 402 }
      );
    }

    // Validate weights sum to 100
    const totalWeight = v.variants.reduce((s, x) => s + x.weight, 0);
    if (totalWeight !== 100) {
      return NextResponse.json({ error: "Variant weights must sum to 100" }, { status: 422 });
    }

    const updateData: Record<string, unknown> = {
      abTestEnabled: v.enabled,
      abTestVariants: v.variants.map((x) => ({
        id: x.id,
        destination: x.destination,
        weight: x.weight,
        label: x.label,
        clicks: 0,
        conversions: 0,
        conversionRate: 0,
        uniqueClicks: 0,
      })),
      abTestDurationDays: v.testDurationDays,
      abTestMinSampleSize: v.minimumSampleSize,
      abTestConfidenceLevel: v.confidenceLevel.toString(),
      abTestAutoSelectWinner: v.autoSelectWinner,
    };

    if (v.enabled && !link.abTestStartedAt) {
      updateData.abTestStartedAt = new Date();
    }
    if (!v.enabled && link.abTestEnabled) {
      updateData.abTestEndedAt = new Date();
    }

    await db.update(links).set(updateData).where(eq(links.id, id));

    // Invalidate KV cache
    redis.del(`link:${link.slug}`).catch(() => {});

    logAudit({
      workspaceId: ws.id,
      actorId: dbUser.id,
      action: "ab_test_update",
      entityType: "link",
      entityId: id,
      metadata: { enabled: v.enabled, variantCount: v.variants.length },
    });

    const updated = await getLink(id);
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[POST /api/links/[id]/ab-test]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/links/[id]/ab-test — disable A/B test and store final results
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const link = await getLink(id);
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const ws = await resolveUserWorkspace(dbUser.id);
    if (link.workspaceId !== ws.id)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    if (!canWrite(ws.role))
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    // Aggregate live click + conversion stats for final results
    const clickStats = await db
      .select({
        variant: clicks.abVariant,
        count: sql<number>`count(*)::int`,
        uniqueClicks: sql<number>`count(distinct ${clicks.ip})::int`,
      })
      .from(clicks)
      .where(and(eq(clicks.linkId, id), sql`${clicks.abVariant} is not null`))
      .groupBy(clicks.abVariant);

    const conversionStats = await db
      .select({
        variant: conversions.abVariant,
        count: sql<number>`count(*)::int`,
      })
      .from(conversions)
      .where(and(eq(conversions.linkId, id), sql`${conversions.abVariant} is not null`))
      .groupBy(conversions.abVariant);

    // Store final results per variant with real data
    if (link.abTestVariants && link.abTestVariants.length > 0) {
      for (const v of link.abTestVariants as any[]) {
        const label = v.label || v.destination;
        const clicks_ = clickStats.find((cs) => cs.variant === label)?.count ?? 0;
        const conversions_ = conversionStats.find((cs) => cs.variant === label)?.count ?? 0;
        await db.insert(abTestResults).values({
          linkId: id,
          workspaceId: ws.id,
          variantDestination: v.destination,
          clicks: clicks_,
          conversions: conversions_,
          conversionRate: clicks_ > 0 ? String(Number((conversions_ / clicks_).toFixed(4))) : "0",
          uniqueClicks: clickStats.find((cs) => cs.variant === label)?.uniqueClicks ?? 0,
          isWinner: false,
        });
      }
    }

    await db
      .update(links)
      .set({ abTestEnabled: false, abTestEndedAt: new Date() })
      .where(eq(links.id, id));

    redis.del(`link:${link.slug}`).catch(() => {});

    logAudit({
      workspaceId: ws.id,
      actorId: dbUser.id,
      action: "ab_test_stop",
      entityType: "link",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/links/[id]/ab-test]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/links/[id]/ab-test/declare-winner — manually declare a winner
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { variantDestination } = z.object({ variantDestination: z.string() }).parse(body);

    const link = await getLink(id);
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const ws = await resolveUserWorkspace(dbUser.id);
    if (link.workspaceId !== ws.id)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    if (!canWrite(ws.role))
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const winnerVariant = (link.abTestVariants ?? []).find(
      (v: any) => v.destination === variantDestination || v.label === variantDestination
    );
    if (!winnerVariant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    await db
      .update(links)
      .set({
        destination: winnerVariant.destination,
        abTestWinner: winnerVariant.label || winnerVariant.destination,
        abTestEnabled: false,
        abTestEndedAt: new Date(),
      })
      .where(eq(links.id, id));

    redis.del(`link:${link.slug}`).catch(() => {});

    logAudit({
      workspaceId: ws.id,
      actorId: dbUser.id,
      action: "ab_test_declare_winner",
      entityType: "link",
      entityId: id,
      metadata: { winner: winnerVariant.label || winnerVariant.destination },
    });

    return NextResponse.json({ success: true, winner: winnerVariant.label || winnerVariant.destination });
  } catch (err) {
    console.error("[PATCH /api/links/[id]/ab-test/declare-winner]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

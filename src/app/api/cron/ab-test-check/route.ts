import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, clicks } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { determineWinner } from "@/lib/ab-test/statistics";
import type { ABVariant } from "@/types/ab-test";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { slug: string; winner: string | null; action: string }[] = [];

  try {
    const activeTests = await db
      .select()
      .from(links)
      .where(and(eq(links.abTestEnabled, true), sql`${links.abTestVariants} is not null`))
      .limit(50);

    for (const link of activeTests) {
      const rawVariants = link.abTestVariants as any[] | null;
      if (!rawVariants || rawVariants.length < 2) continue;

      // Aggregate live click data per variant
      const clickStats = await db
        .select({
          variant: clicks.abVariant,
          count: sql<number>`count(*)::int`,
          uniqueClicks: sql<number>`count(distinct ${clicks.ip})::int`,
        })
        .from(clicks)
        .where(and(eq(clicks.linkId, link.id), sql`${clicks.abVariant} is not null`))
        .groupBy(clicks.abVariant);

      const variants: ABVariant[] = rawVariants.map((v: any) => {
        const stats = clickStats.find((cs) => cs.variant === (v.label || v.destination));
        return {
          id: v.id || "",
          destination: v.destination,
          weight: v.weight,
          label: v.label || "",
          clicks: stats?.count ?? v.clicks ?? 0,
          conversions: v.conversions ?? 0,
          conversionRate: v.conversionRate ?? 0,
          uniqueClicks: stats?.uniqueClicks ?? v.uniqueClicks ?? 0,
        };
      });

      const result = determineWinner(variants);

      if (result.isSignificant && result.winner) {
        const winnerVariant = rawVariants.find(
          (v: any) => v.destination === result.winner || v.label === result.winner
        );
        if (winnerVariant) {
          await db
            .update(links)
            .set({
              destination: winnerVariant.destination,
              abTestWinner: winnerVariant.label || winnerVariant.destination,
              abTestEnabled: false,
              abTestEndedAt: new Date(),
            })
            .where(eq(links.id, link.id));

          results.push({
            slug: link.slug,
            winner: winnerVariant.label || winnerVariant.destination,
            action: "auto_declared",
          });
        }
      } else {
        results.push({
          slug: link.slug,
          winner: null,
          action: "no_winner_yet",
        });
      }
    }
  } catch (err) {
    console.error("[CRON ab-test-check]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ checked: results.length, results });
}

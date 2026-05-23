import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, clicks } from "@/lib/db/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { aiJson } from "@/lib/ai/client";

interface AbSuggestion {
  recommendation: string;
  suggestedWeights: { variantIndex: number; weight: number }[];
  reasoning: string;
}

export async function POST(req: Request) {
  try {
    const { linkId } = await req.json();
    if (!linkId) {
      return NextResponse.json({ error: "linkId required" }, { status: 400 });
    }

    const link = await db.query.links.findFirst({
      where: eq(links.id, linkId),
    });

    if (!link || !link.abTestEnabled || !link.abTestVariants || link.abTestVariants.length < 2) {
      return NextResponse.json(
        { error: "Link does not have A/B testing enabled with at least 2 variants" },
        { status: 400 }
      );
    }

    // Fetch click data per variant
    const totalClicks = link.totalClicks || 0;
    if (totalClicks < 10) {
      return NextResponse.json({
        recommendation: "Not enough data yet — need at least 10 total clicks.",
        suggestedWeights: [],
        reasoning: "",
      });
    }

    // Count clicks per variant from the clicks table
    const variantCounts = await db
      .select({
        variant: clicks.abVariant,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(and(eq(clicks.linkId, linkId), isNotNull(clicks.abVariant)))
      .groupBy(clicks.abVariant);

    const variantMap = new Map(variantCounts.map((v) => [v.variant, v.count]));

    // Get the destination of each variant for the prompt
    const variants = link.abTestVariants as { destination: string; weight: number }[];

    const performanceData = variants.map((v, i) => ({
      index: i,
      destination: v.destination,
      currentWeight: v.weight,
      clicks: variantMap.get(v.destination) ?? variantMap.get(String(i)) ?? 0,
    }));

    const suggestion = await aiJson<AbSuggestion>(
      `You are an A/B test optimizer. Given variant performance data,
recommend new weight distribution to maximise conversions.
Respond with JSON:
{
  "recommendation": "brief human-readable summary",
  "suggestedWeights": [{ "variantIndex": number, "weight": number }],
  "reasoning": "why this distribution is better"
}
Weights must sum to 100 and each weight must be >= 1.`,
      JSON.stringify({ totalClicks, variants: performanceData })
    );

    // Validate weights sum to 100
    if (suggestion.suggestedWeights.length > 0) {
      const sum = suggestion.suggestedWeights.reduce((s, w) => s + w.weight, 0);
      if (sum !== 100) {
        suggestion.suggestedWeights = variants.map((_, i) => ({
          variantIndex: i,
          weight: Math.round(100 / variants.length),
        }));
      }
    }

    return NextResponse.json({
      linkId,
      totalClicks,
      performance: performanceData,
      suggestion,
    });
  } catch (err) {
    console.error("[POST /api/ai/optimize-ab]", err);
    return NextResponse.json({ error: "Optimisation failed" }, { status: 500 });
  }
}

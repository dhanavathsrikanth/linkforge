import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerJourneys, links } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { eq, and, gte, inArray, desc } from "drizzle-orm";
import type { Touchpoint, AttributionModel, AttributionReport, LinkCredit, CustomerPath } from "@/types/attribution";
import { generateAttributionReport } from "@/lib/attribution/models";

const RANGE_MS: Record<string, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") as AttributionModel | null;
  const range = searchParams.get("range") || "30d";

  if (!model || !["first_touch", "last_touch", "linear", "time_decay"].includes(model)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid or missing model param" } },
      { status: 400 }
    );
  }

  const cutoff = new Date(Date.now() - (RANGE_MS[range] || RANGE_MS["30d"]));

  const rows = await db
    .select()
    .from(customerJourneys)
    .where(
      and(
        eq(customerJourneys.workspaceId, auth.workspaceId),
        eq(customerJourneys.converted, true),
        gte(customerJourneys.conversionAt!, cutoff)
      )
    )
    .orderBy(desc(customerJourneys.conversionAt!));

  const journeys = rows.map((r) => ({
    touchpoints: (r.touchpoints || []) as Touchpoint[],
    converted: r.converted || false,
    conversionValue: parseFloat(r.conversionValue as string) || 0,
  }));

  const linkStats = generateAttributionReport(journeys, model);
  const linkIds = [...linkStats.keys()];

  let linkRows: { id: string; slug: string; destination: string }[] = [];
  if (linkIds.length > 0) {
    linkRows = await db
      .select({ id: links.id, slug: links.slug, destination: links.destination })
      .from(links)
      .where(inArray(links.id, linkIds));
  }
  const linkMap = new Map(linkRows.map((l) => [l.id, l]));

  const linkCredits: LinkCredit[] = [...linkStats.entries()]
    .map(([linkId, stats]) => {
      const l = linkMap.get(linkId);
      return {
        linkId,
        slug: l?.slug || "deleted",
        destination: l?.destination || "",
        credit: parseFloat((stats.credit * 100).toFixed(4)),
        creditValue: parseFloat(stats.creditValue.toFixed(2)),
        assistedConversions: stats.assistedConversions,
        directConversions: stats.directConversions,
      };
    })
    .sort((a, b) => b.credit - a.credit);

  const totalConversions = journeys.filter((j) => j.converted).length;
  const totalRevenue = journeys.reduce((s, j) => s + j.conversionValue, 0);

  const pathCounts = new Map<string, { count: number; conversions: number; totalValue: number }>();
  for (const j of journeys) {
    if (!j.converted || j.touchpoints.length < 2) continue;
    const pathKey = j.touchpoints.map((t) => t.slug || t.linkId).join(" → ");
    const existing = pathCounts.get(pathKey) || { count: 0, conversions: 0, totalValue: 0 };
    existing.count++;
    existing.conversions++;
    existing.totalValue += j.conversionValue;
    pathCounts.set(pathKey, existing);
  }

  const topPath: CustomerPath[] = [...pathCounts.entries()]
    .map(([key, val]) => ({
      touchpoints: key.split(" → "),
      count: val.count,
      conversions: val.conversions,
      totalValue: parseFloat(val.totalValue.toFixed(2)),
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 10);

  const convertedJourneys = journeys.filter((j) => j.converted && j.touchpoints.length > 0);
  const avgTouchpointsToConvert = convertedJourneys.length
    ? parseFloat((convertedJourneys.reduce((s, j) => s + j.touchpoints.length, 0) / convertedJourneys.length).toFixed(1))
    : 0;

  let avgDaysToConvert = 0;
  if (convertedJourneys.length > 0) {
    let totalDays = 0;
    let count = 0;
    for (const j of convertedJourneys) {
      const first = j.touchpoints[0]?.timestamp;
      const last = j.touchpoints[j.touchpoints.length - 1]?.timestamp;
      if (first && last) {
        totalDays += (last - first) / (1000 * 60 * 60 * 24);
        count++;
      }
    }
    avgDaysToConvert = count ? parseFloat((totalDays / count).toFixed(1)) : 0;
  }

  const report: AttributionReport = {
    model,
    totalConversions,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    linkCredits,
    topPath,
    avgTouchpointsToConvert,
    avgDaysToConvert,
  };

  return NextResponse.json({ data: report });
}

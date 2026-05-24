import type { Touchpoint, AttributionModel } from "@/types/attribution";

export function calculateAttributionCredits(
  touchpoints: Touchpoint[],
  model: AttributionModel,
  conversionValue: number = 0
): Record<string, number> {
  if (touchpoints.length === 0) return {};

  const credits: Record<string, number> = {};
  const linkIds = touchpoints.map(t => t.linkId);

  switch (model) {
    case "first_touch":
      credits[linkIds[0]] = conversionValue;
      break;

    case "last_touch":
      credits[linkIds[linkIds.length - 1]] = conversionValue;
      break;

    case "linear": {
      const credit = conversionValue / touchpoints.length;
      touchpoints.forEach(t => {
        credits[t.linkId] = (credits[t.linkId] || 0) + credit;
      });
      break;
    }

    case "time_decay": {
      const conversionTime = touchpoints[touchpoints.length - 1].timestamp;
      const halfLifeMs = 7 * 24 * 60 * 60 * 1000;

      const weights = touchpoints.map(t => {
        const ageMs = conversionTime - t.timestamp;
        return Math.pow(2, -ageMs / halfLifeMs);
      });

      const totalWeight = weights.reduce((s, w) => s + w, 0);
      touchpoints.forEach((t, i) => {
        credits[t.linkId] = (credits[t.linkId] || 0) + (weights[i] / totalWeight) * conversionValue;
      });
      break;
    }
  }

  return credits;
}

export function generateAttributionReport(
  journeys: Array<{ touchpoints: Touchpoint[]; converted: boolean; conversionValue: number }>,
  model: AttributionModel
): Map<string, { credit: number; creditValue: number; assistedConversions: number; directConversions: number }> {
  const linkStats = new Map<string, { credit: number; creditValue: number; assistedConversions: number; directConversions: number }>();

  for (const journey of journeys) {
    if (!journey.converted) continue;

    const credits = calculateAttributionCredits(journey.touchpoints, model, journey.conversionValue);
    const lastLinkId = journey.touchpoints[journey.touchpoints.length - 1]?.linkId;

    for (const [linkId, credit] of Object.entries(credits)) {
      const existing = linkStats.get(linkId) || { credit: 0, creditValue: 0, assistedConversions: 0, directConversions: 0 };
      existing.credit += credit / journey.conversionValue;
      existing.creditValue += credit;
      if (linkId === lastLinkId) existing.directConversions++;
      else existing.assistedConversions++;
      linkStats.set(linkId, existing);
    }
  }

  return linkStats;
}

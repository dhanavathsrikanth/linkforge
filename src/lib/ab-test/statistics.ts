import type { ABVariant, ABTestResult, ABVariantStat } from "@/types/ab-test";

export function calculateBayesianProbability(
  controlClicks: number,
  controlConversions: number,
  variantClicks: number,
  variantConversions: number,
  simulations: number = 10000
): number {
  const controlAlpha = controlConversions + 1;
  const controlBeta = controlClicks - controlConversions + 1;
  const variantAlpha = variantConversions + 1;
  const variantBeta = variantClicks - variantConversions + 1;

  let variantWins = 0;
  for (let i = 0; i < simulations; i++) {
    const controlSample = sampleBeta(controlAlpha, controlBeta);
    const variantSample = sampleBeta(variantAlpha, variantBeta);
    if (variantSample > controlSample) variantWins++;
  }
  return variantWins / simulations;
}

function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

function sampleGamma(shape: number): number {
  if (shape < 1) {
    return sampleGamma(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function calculateConfidenceInterval(
  clicks: number,
  conversions: number,
  confidence: number = 0.95
): [number, number] {
  const rate = conversions / Math.max(clicks, 1);
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const margin = z * Math.sqrt((rate * (1 - rate)) / Math.max(clicks, 1));
  return [Math.max(0, rate - margin), Math.min(1, rate + margin)];
}

export function determineWinner(variants: ABVariant[]): ABTestResult {
  if (variants.length < 2) {
    return { winner: null, confidence: 0, isSignificant: false, recommendation: "Need at least 2 variants", variantStats: [] };
  }

  const control = variants[0];
  const hasMinSample = variants.every((v) => v.clicks >= 100);

  if (!hasMinSample) {
    return {
      winner: null,
      confidence: 0,
      isSignificant: false,
      recommendation: `Need at least 100 clicks per variant. Lowest: ${Math.min(...variants.map((v) => v.clicks))} clicks.`,
      variantStats: variants.map((v, i) => ({
        destination: v.destination,
        label: v.label,
        clicks: v.clicks,
        conversionRate: v.conversionRate,
        relativeUplift: 0,
        confidenceInterval: calculateConfidenceInterval(v.clicks, v.conversions),
        pValue: 1,
        isControl: i === 0,
      })),
    };
  }

  const variantStats: ABVariantStat[] = variants.map((v, i) => {
    const ci = calculateConfidenceInterval(v.clicks, v.conversions);
    const uplift =
      i === 0
        ? 0
        : ((v.conversionRate - control.conversionRate) / Math.max(control.conversionRate, 0.0001)) * 100;
    const prob =
      i === 0
        ? 0
        : calculateBayesianProbability(control.clicks, control.conversions, v.clicks, v.conversions);
    return {
      destination: v.destination,
      label: v.label,
      clicks: v.clicks,
      conversionRate: v.conversionRate,
      relativeUplift: uplift,
      confidenceInterval: ci,
      pValue: 1 - prob,
      isControl: i === 0,
    };
  });

  const bestVariant = [...variants].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  const bestStat = variantStats.find((s) => s.destination === bestVariant.destination)!;
  const confidence = 1 - bestStat.pValue;
  const isSignificant = confidence >= 0.95;

  return {
    winner: isSignificant ? bestVariant.destination : null,
    confidence,
    isSignificant,
    recommendation: isSignificant
      ? `${bestVariant.label} wins with ${(confidence * 100).toFixed(1)}% confidence. Uplift: +${bestStat.relativeUplift.toFixed(1)}%.`
      : `No winner yet. Continue test. Best so far: ${bestVariant.label} (+${bestStat.relativeUplift.toFixed(1)}%).`,
    variantStats,
  };
}

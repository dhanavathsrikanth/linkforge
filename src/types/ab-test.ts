export interface ABVariant {
  id: string;
  destination: string;
  weight: number;
  label: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  uniqueClicks: number;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABVariant[];
  minimumSampleSize: number;
  confidenceLevel: number;
  autoSelectWinner: boolean;
  testDurationDays: number;
}

export interface ABTestResult {
  winner: string | null;
  confidence: number;
  isSignificant: boolean;
  recommendation: string;
  variantStats: ABVariantStat[];
}

export interface ABVariantStat {
  destination: string;
  label: string;
  clicks: number;
  conversionRate: number;
  relativeUplift: number;
  confidenceInterval: [number, number];
  pValue: number;
  isControl: boolean;
}

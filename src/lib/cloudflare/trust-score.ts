import type { ScanResult } from "./url-scanner";
import type { AssetRiskKind } from "./asset-risk-analyzer";

/**
 * Trust Score engine.
 *
 * Pure deterministic function from a Scan_Report-shaped input plus a
 * versioned weight table → an integer score in [0, 100] and a Trust_Band.
 *
 * Invariants (Req 23):
 *   - score ∈ [0, 100]
 *   - score(B) ≤ score(A) when B differs only by adding `malicious=true`
 *   - score(B) ≤ score(A) when B has a longer redirect chain than A
 *   - score(B) ≤ score(A) when B has more AssetRiskFlags than A
 *   - band(score) is a deterministic function
 *
 * This module has no side effects. Persistence is the caller's job.
 */

export const TRUST_WEIGHT_VERSION = 1;

export type TrustBand = "unknown" | "low" | "medium" | "high" | "verified";

export interface TrustInputs {
  /** Cloudflare overall verdict (verdicts.overall.malicious) */
  malicious: boolean;
  /** Phishing kit names from meta.processors.phishing */
  phishing: string[];
  /** Length of the redirect chain — count of hops in page.history */
  redirectChainLength: number;
  /** Whether any TLS certificate is expired *as of now*. */
  hasExpiredCertificate: boolean;
  /** Cloudflare Radar Rank (1 = most popular). null when not present. */
  radarRank: number | null;
  /** Asset risk flag kinds emitted by Asset_Risk_Analyzer */
  riskFlags: AssetRiskKind[];
  /** True when the similarity-search step matched a malicious scan */
  similarToMalicious: boolean;
}

export interface TrustScoreOutput {
  score: number;     // 0..100
  band: TrustBand;
  /** Top contributing factors (negative deltas) for display in UI / interstitials */
  factors: TrustFactor[];
  weightVersion: number;
}

export interface TrustFactor {
  key: string;
  label: string;
  delta: number; // signed; positive = trust gain, negative = trust loss
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function bandForScore(score: number): TrustBand {
  if (score >= 80) return "verified";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

// ─── Adapter: ScanResult → TrustInputs ───────────────────────────────────────

export function inputsFromScanResult(
  result: ScanResult,
  riskFlags: AssetRiskKind[],
  similarToMalicious: boolean
): TrustInputs {
  const now = Date.now();
  const hasExpiredCertificate = result.certificates.some((c) => {
    if (!c.validTo) return false;
    const t = Date.parse(c.validTo);
    return Number.isFinite(t) && t < now;
  });
  return {
    malicious: result.verdicts.overall.malicious,
    phishing: result.verdicts.overall.phishing ?? [],
    redirectChainLength: result.redirectChain.length,
    hasExpiredCertificate,
    radarRank: result.radarRank,
    riskFlags,
    similarToMalicious,
  };
}

// ─── Score ────────────────────────────────────────────────────────────────────

/**
 * Compute the Trust Score deterministically.
 *
 * The algorithm is intentionally simple so it's auditable:
 *   - Start at 75 (neutral baseline).
 *   - Apply each factor (some absolute caps, some additive deltas).
 *   - Clamp to [0, 100].
 *   - Caps for Cloudflare's hard verdicts override additive deltas — i.e. a
 *     malicious verdict can never produce a score > 20 even if every other
 *     signal is positive.
 *
 * Monotonicity is enforced by: every factor that adds risk has delta ≤ 0,
 * every factor that adds trust has delta ≥ 0, and caps are non-decreasing
 * in risk.
 */
export function computeTrustScore(inputs: TrustInputs): TrustScoreOutput {
  const factors: TrustFactor[] = [];

  let raw = 75;
  let cap = 100;

  // ── Hard caps from Cloudflare verdicts ────────────────────────────────
  if (inputs.malicious) {
    cap = Math.min(cap, 20);
    factors.push({ key: "malicious", label: "Cloudflare flagged this destination as malicious", delta: -55 });
  }
  if (inputs.phishing && inputs.phishing.length > 0) {
    cap = Math.min(cap, 30);
    factors.push({
      key: "phishing",
      label: `Phishing kit detected: ${inputs.phishing.slice(0, 2).join(", ")}`,
      delta: -45,
    });
  }
  if (inputs.similarToMalicious) {
    factors.push({ key: "similar", label: "Visually/structurally similar to known malicious sites", delta: -25 });
    raw -= 25;
  }

  // ── Additive penalties ─────────────────────────────────────────────────
  if (inputs.redirectChainLength > 5) {
    const delta = -10 - (inputs.redirectChainLength - 5) * 2;
    factors.push({
      key: "long_redirect_chain",
      label: `${inputs.redirectChainLength} redirects before final destination`,
      delta,
    });
    raw += delta;
  } else if (inputs.redirectChainLength > 1) {
    const delta = -2 * (inputs.redirectChainLength - 1);
    factors.push({
      key: "redirect_chain",
      label: `${inputs.redirectChainLength} hops to final destination`,
      delta,
    });
    raw += delta;
  }

  if (inputs.hasExpiredCertificate) {
    factors.push({
      key: "expired_certificate",
      label: "TLS certificate is expired",
      delta: -15,
    });
    raw -= 15;
  }

  // Per-flag penalty — small, additive. Order doesn't matter because the
  // operation is commutative (sum of negatives).
  const FLAG_PENALTY: Record<AssetRiskKind, number> = {
    crypto_miner: -25,
    fingerprinter: -10,
    suspicious_global: -10,
    excessive_third_party_cookies: -5,
    console_error_burst: -3,
    expired_certificate: 0, // already accounted for above
    long_redirect_chain: 0, // already accounted for above
    similar_to_malicious: 0, // already accounted for above
  };
  for (const flag of inputs.riskFlags) {
    const delta = FLAG_PENALTY[flag] ?? 0;
    if (delta < 0) {
      factors.push({ key: `flag:${flag}`, label: `Asset risk: ${flag}`, delta });
      raw += delta;
    }
  }

  // ── Trust gains ────────────────────────────────────────────────────────
  if (inputs.radarRank !== null && inputs.radarRank > 0 && inputs.radarRank <= 100_000) {
    const delta = inputs.radarRank <= 10_000 ? 10 : 5;
    factors.push({
      key: "radar_rank",
      label: `Cloudflare Radar Rank: top ${inputs.radarRank <= 10_000 ? "10K" : "100K"}`,
      delta,
    });
    raw += delta;
  }

  // ── Apply cap and clamp ───────────────────────────────────────────────
  const score = clamp(Math.min(raw, cap), 0, 100);
  const band: TrustBand = bandForScore(score);

  // Sort factors by absolute delta descending so callers can pick top N
  factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    score,
    band,
    factors,
    weightVersion: TRUST_WEIGHT_VERSION,
  };
}

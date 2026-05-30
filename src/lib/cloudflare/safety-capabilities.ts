import type { Plan } from "@/lib/db";

/**
 * Safety capability matrix (Req 18). Resolves Plan → boolean flags
 * gating each enhanced safety feature. Centralizes plan-tier logic so
 * both API routes and UI can ask the same question.
 */

export interface SafetyCapabilities {
  /** Basic verdict (malicious / safe) — always available */
  basicVerdict: true;
  /** Tech stack (Wappalyzer) panel on link detail */
  techStack: boolean;
  /** Screenshot proof on link detail / preview */
  screenshot: boolean;
  /** Redirect chain visualization */
  redirectChain: boolean;
  /** Cloudflare similarity search */
  similaritySearch: boolean;
  /** Public Trust API */
  trustApi: boolean;
  /** Scheduled rescans (Rescan_Scheduler) */
  scheduledRescan: boolean;
  /** link.flagged_* webhook events through Svix */
  webhookSafetyEvents: boolean;
  /** Public visitor preview page at /s/[slug]/preview */
  visitorPreview: boolean;
  /** Asset risk analyzer flags shown to the user */
  assetRiskFlags: boolean;
}

export function safetyCapabilitiesForPlan(plan: Plan): SafetyCapabilities {
  // Tier ordering used elsewhere in the codebase
  const isStarterOrAbove = plan !== "free";
  const isGrowthOrAbove =
    plan === "growth" ||
    plan === "agency" ||
    plan === "business" ||
    plan === "enterprise";
  const isBusinessOrAbove =
    plan === "business" || plan === "enterprise";

  return {
    basicVerdict: true,
    techStack: isGrowthOrAbove,
    screenshot: isGrowthOrAbove,
    redirectChain: isGrowthOrAbove,
    visitorPreview: isGrowthOrAbove,
    assetRiskFlags: isStarterOrAbove,
    webhookSafetyEvents: isStarterOrAbove,
    scheduledRescan: isStarterOrAbove,
    similaritySearch: isBusinessOrAbove,
    trustApi: isBusinessOrAbove,
  };
}

/** Per-plan daily ceiling for Cloudflare scan submissions (Req 20). */
export function scanCeilingForPlan(plan: Plan): number {
  switch (plan) {
    case "free":
      return 50;
    case "starter":
      return 250;
    case "growth":
      return 1_000;
    case "agency":
      return 2_500;
    case "business":
      return 5_000;
    case "enterprise":
      return 25_000;
    default:
      return 50;
  }
}

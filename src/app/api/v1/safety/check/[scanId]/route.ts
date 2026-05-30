import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { safetyCapabilitiesForPlan } from "@/lib/cloudflare/safety-capabilities";
import { db, workspaces } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getScanResult } from "@/lib/cloudflare/url-scanner";
import { computeTrustScore, inputsFromScanResult } from "@/lib/cloudflare/trust-score";
import { analyzeAssetRisks } from "@/lib/cloudflare/asset-risk-analyzer";
import { incrementUsage } from "@/lib/billing/usage";

/**
 * GET /api/v1/safety/check/[scanId]
 *
 * Poll endpoint for a previously-submitted scan. Returns 202 while still
 * running, 200 with the verdict when finished. Same plan / auth gating as
 * the parent endpoint.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { workspaceId } = authResult;

  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { plan: true },
  });
  const capabilities = safetyCapabilitiesForPlan(ws?.plan ?? "free");
  if (!capabilities.trustApi) {
    return NextResponse.json({ error: "plan_upgrade_required" }, { status: 403 });
  }

  const { scanId } = await params;
  const result = await getScanResult(scanId);
  if (!result) {
    return NextResponse.json({ scanId, status: "in_progress" }, { status: 202 });
  }

  if (result.status === "Failed") {
    return NextResponse.json(
      { scanId, status: "failed" },
      { status: 200 }
    );
  }

  const flags = analyzeAssetRisks(result);
  const trust = computeTrustScore(
    inputsFromScanResult(result, flags.map((f) => f.kind), false)
  );

  await incrementUsage(workspaceId, "apiCalls", 1).catch(() => {});

  return NextResponse.json({
    url: result.submittedUrl,
    scanId,
    cacheHit: false,
    trustScore: trust.score,
    trustBand: trust.band,
    verdict: {
      malicious: result.verdicts.overall.malicious,
      phishingKit: result.verdicts.overall.phishing?.[0] ?? null,
    },
    categories: result.categories,
    assetRiskFlags: flags.map((f) => f.kind),
    redirectChainLength: result.redirectChain.length,
    scannedAt: new Date(),
  });
}

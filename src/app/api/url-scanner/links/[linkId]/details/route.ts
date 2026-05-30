import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, links, scanReports, assetRiskFlags, scanScreenshots } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace } from "@/lib/db/workspace";
import { safetyCapabilitiesForPlan } from "@/lib/cloudflare/safety-capabilities";
import { createScreenshotToken } from "@/lib/cloudflare/screenshot-token";

/**
 * GET /api/url-scanner/links/[linkId]/details
 *
 * Returns the full latest scan report for a link plus its asset risk flags,
 * filtered by the workspace's plan capabilities. Used by the expanded row
 * view on /dashboard/link-safety.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { linkId } = await params;
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.id, linkId),
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, link.workspaceId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const capabilities = safetyCapabilitiesForPlan(ws.plan);

    const [latest] = await db
      .select()
      .from(scanReports)
      .where(and(eq(scanReports.linkId, linkId), eq(scanReports.status, "finished")))
      .orderBy(desc(scanReports.fetchedAt))
      .limit(1);

    const flags = latest
      ? await db
          .select({
            id: assetRiskFlags.id,
            kind: assetRiskFlags.kind,
            payload: assetRiskFlags.payload,
            createdAt: assetRiskFlags.createdAt,
          })
          .from(assetRiskFlags)
          .where(eq(assetRiskFlags.scanId, latest.id))
      : [];

    // Resolve a screenshot token if (a) the workspace plan permits it and
    // (b) bytes for this scan exist in `scan_screenshots`. Token is good
    // for 10 minutes — well within the [5m, 15m] bound from Req 24.3.
    let screenshotUrl: string | null = null;
    if (latest && capabilities.screenshot) {
      const [shot] = await db
        .select({ id: scanScreenshots.id })
        .from(scanScreenshots)
        .where(eq(scanScreenshots.scanId, latest.scanId))
        .limit(1);
      if (shot) {
        const token = createScreenshotToken(latest.scanId);
        screenshotUrl = `/api/url-scanner/screenshot?token=${encodeURIComponent(token)}`;
      }
    }

    // Apply plan gating: redact fields the workspace can't access
    const safeReport = latest
      ? {
          id: latest.id,
          scanId: latest.scanId,
          status: latest.status,
          fetchedAt: latest.fetchedAt,
          malicious: latest.malicious,
          phishingKit: latest.phishingKit,
          page: {
            url: latest.pageUrl,
            ip: latest.pageIp,
            asn: latest.pageAsn,
            asnName: latest.pageAsnName,
            country: latest.pageCountry,
            server: latest.pageServer,
          },
          radarRank: latest.radarRank,
          trustScore: latest.trustScore,
          trustBand: latest.trustBand,
          weightVersion: latest.weightVersion,
          categories: latest.categories,
          // Plan-gated:
          redirectChain: capabilities.redirectChain ? latest.redirectChain : null,
          technologies: capabilities.techStack ? latest.technologies : null,
          contactedDomains: capabilities.assetRiskFlags ? latest.contactedDomains : null,
          performance: latest.performance,
          cookies: capabilities.assetRiskFlags ? latest.cookiesSummary : null,
          console: capabilities.assetRiskFlags ? latest.consoleSummary : null,
          screenshotHash: capabilities.screenshot ? latest.screenshotHash : null,
          screenshotUrl,
          harSummary: capabilities.assetRiskFlags ? latest.harSummary : null,
          domAnalysis: capabilities.assetRiskFlags ? latest.domAnalysis : null,
        }
      : null;

    return NextResponse.json({
      linkId,
      capabilities,
      report: safeReport,
      flags: capabilities.assetRiskFlags ? flags : [],
      link: {
        slug: link.slug,
        destination: link.destination,
        title: link.title,
        safetyStatus: link.safetyStatus,
        safetyTrustScore: link.safetyTrustScore,
        safetyTrustBand: link.safetyTrustBand,
        safetyScannedAt: link.safetyScannedAt,
        safetyBlockedByAdmin: link.safetyBlockedByAdmin,
      },
    });
  } catch (err) {
    console.error("[GET /api/url-scanner/links/[linkId]/details]", err);
    return NextResponse.json(
      { error: "Failed to load scan details" },
      { status: 500 }
    );
  }
}

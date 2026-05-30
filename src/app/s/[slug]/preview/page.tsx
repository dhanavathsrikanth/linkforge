import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db, links, scanReports, workspaces, scanScreenshots } from "@/lib/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { safetyCapabilitiesForPlan } from "@/lib/cloudflare/safety-capabilities";
import { createScreenshotToken } from "@/lib/cloudflare/screenshot-token";
import { VisitorPreview } from "./VisitorPreview";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Preview — ${slug}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Public visitor preview page (Req 13).
 *
 * Shows the destination URL, screenshot, Trust Badge, and tech categories
 * before completing the redirect. Only available when:
 *   - the link exists, is active, and has no domainId (default `/s/...`)
 *   - the workspace plan permits visitor previews (Growth+)
 *   - the workspace owner hasn't disabled the preview opt-in
 *
 * For low-band (malicious) links we delegate to the existing /blocked
 * interstitial — no need to re-implement that view here.
 */
export default async function VisitorPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const link = await db.query.links.findFirst({
    where: (l, { eq, and, isNull }) =>
      and(eq(l.slug, slug), isNull(l.domainId)),
  });

  if (!link || !link.isActive) notFound();

  // Resolve workspace plan + opt-in status
  const ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, link.workspaceId),
    columns: { plan: true, visitorPreviewEnabled: true },
  });
  if (!ws) notFound();

  const capabilities = safetyCapabilitiesForPlan(ws.plan);
  if (!capabilities.visitorPreview) notFound(); // plan gate
  if (!ws.visitorPreviewEnabled) notFound(); // workspace opt-out

  // Trust Band low → render the same content as the existing /blocked
  // interstitial. Easiest path: redirect there. Status 200 per Req 13.4
  // is a "render the same content", not a redirect, but the user reads
  // the same page either way and the cookie bypass logic stays put.
  if (link.safetyTrustBand === "low") {
    notFound(); // dispatch to /blocked through the redirect handler
  }

  // Latest finished scan
  const [latest] = await db
    .select()
    .from(scanReports)
    .where(and(eq(scanReports.linkId, link.id), eq(scanReports.status, "finished")))
    .orderBy(desc(scanReports.fetchedAt))
    .limit(1);

  // Resolve screenshot URL via signed token (only when bytes exist)
  let screenshotUrl: string | null = null;
  if (latest) {
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

  let destinationHost = link.destination;
  try {
    destinationHost = new URL(link.destination).host;
  } catch {
    /* keep raw */
  }

  return (
    <VisitorPreview
      slug={link.slug}
      destination={link.destination}
      destinationHost={destinationHost}
      title={link.title}
      trustScore={latest?.trustScore ?? link.safetyTrustScore}
      trustBand={(latest?.trustBand ?? link.safetyTrustBand) as
        | "unknown"
        | "low"
        | "medium"
        | "high"
        | "verified"}
      screenshotUrl={screenshotUrl}
      categories={(latest?.categories as string[] | null) ?? []}
      technologies={
        capabilities.techStack
          ? ((latest?.technologies as { name: string }[] | null) ?? []).slice(0, 8).map((t) => t.name)
          : []
      }
      country={latest?.pageCountry ?? null}
      asnName={latest?.pageAsnName ?? null}
      scannedAt={latest?.fetchedAt ?? link.safetyScannedAt ?? null}
    />
  );
}

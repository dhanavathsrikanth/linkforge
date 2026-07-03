import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, scanReports } from "@/lib/db/schema";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { aiComplete } from "@/lib/ai/client";

interface CloudflareScanData {
  safetyStatus: string | null;
  safetyTrustScore: number | null;
  safetyTrustBand: string | null;
  safetyScannedAt: Date | null;
  safetyVerdict: {
    malicious: boolean;
    categories?: string[];
    phishing?: string[];
    domain?: string;
    country?: string;
    asn?: string;
    asnName?: string;
    technologies?: { name: string; categories: string[] }[];
  } | null;
  // From scan_reports (latest finished)
  redirectChain?: { url: string; status: number; ip?: string; country?: string }[] | null;
  performance?: { ttfbMs?: number; fcpMs?: number; loadMs?: number } | null;
  pageIp?: string | null;
  pageCountry?: string | null;
  pageServer?: string | null;
  radarRank?: number | null;
  contactedDomains?: string[] | null;
}

interface CheckResult {
  linkId: string;
  slug: string;
  destination: string;
  status: "ok" | "broken" | "changed";
  statusCode?: number;
  summary?: string;
  cloudflare?: CloudflareScanData;
}

export async function POST(req: Request) {
  try {
    const { workspaceId, linkIds } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    let batch;
    if (linkIds && Array.isArray(linkIds) && linkIds.length > 0) {
      batch = await db.query.links.findMany({
        where: and(eq(links.workspaceId, workspaceId), inArray(links.id, linkIds)),
        limit: 200,
        columns: {
          id: true, slug: true, destination: true, title: true,
          safetyStatus: true, safetyTrustScore: true, safetyTrustBand: true,
          safetyScannedAt: true, safetyVerdict: true, safetyScanId: true,
        },
      });
    } else {
      batch = await db.query.links.findMany({
        where: eq(links.workspaceId, workspaceId),
        limit: 200,
        columns: {
          id: true, slug: true, destination: true, title: true,
          safetyStatus: true, safetyTrustScore: true, safetyTrustBand: true,
          safetyScannedAt: true, safetyVerdict: true, safetyScanId: true,
        },
      });
    }

    // Fetch latest finished scan_reports for all links in one query
    const linkIdList = batch.map((l) => l.id);
    const latestReports =
      linkIdList.length > 0
        ? await db
            .selectDistinctOn([scanReports.linkId], {
              linkId: scanReports.linkId,
              redirectChain: scanReports.redirectChain,
              performance: scanReports.performance,
              pageIp: scanReports.pageIp,
              pageCountry: scanReports.pageCountry,
              pageServer: scanReports.pageServer,
              radarRank: scanReports.radarRank,
              contactedDomains: scanReports.contactedDomains,
              fetchedAt: scanReports.fetchedAt,
            })
            .from(scanReports)
            .where(
              and(
                inArray(scanReports.linkId, linkIdList),
                eq(scanReports.status, "finished")
              )
            )
            .orderBy(scanReports.linkId, desc(scanReports.fetchedAt))
        : [];

    const reportByLinkId = new Map(latestReports.map((r) => [r.linkId, r]));

    const results: CheckResult[] = [];

    for (const link of batch) {
      let statusCode = 0;

      // Build Cloudflare enrichment from DB (no extra API call needed)
      const report = reportByLinkId.get(link.id);
      const cloudflare: CloudflareScanData = {
        safetyStatus: link.safetyStatus ?? null,
        safetyTrustScore: link.safetyTrustScore ?? null,
        safetyTrustBand: link.safetyTrustBand ?? null,
        safetyScannedAt: link.safetyScannedAt ?? null,
        safetyVerdict: (link.safetyVerdict as CloudflareScanData["safetyVerdict"]) ?? null,
        redirectChain: (report?.redirectChain as CloudflareScanData["redirectChain"]) ?? null,
        performance: (report?.performance as CloudflareScanData["performance"]) ?? null,
        pageIp: report?.pageIp ?? null,
        pageCountry: report?.pageCountry ?? null,
        pageServer: report?.pageServer ?? null,
        radarRank: report?.radarRank ?? null,
        contactedDomains: (report?.contactedDomains as string[] | null) ?? null,
      };

      try {
        const res = await fetch(link.destination, {
          method: "GET",
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; PivotUrl/1.0; +https://pivoturl.com)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          redirect: "follow",
        });
        statusCode = res.status;

        if (statusCode >= 400) {
          results.push({
            linkId: link.id,
            slug: link.slug,
            destination: link.destination,
            status: "broken",
            statusCode,
            cloudflare,
          });
          continue;
        }

        if (link.title) {
          try {
            const html = await res.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const currentTitle = titleMatch ? titleMatch[1].trim() : "";
            const bodySample = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 1000);

            if (currentTitle && link.title !== currentTitle) {
              const aiCheck = await aiComplete(
                [
                  {
                    role: "system",
                    content:
                      "You detect content drift. Compare the original title with the current page. Reply with just 'yes' if content has significantly changed, or 'no' if it's essentially the same page.",
                  },
                  {
                    role: "user",
                    content: `Original title: "${link.title}"\nCurrent page title: "${currentTitle}"\nContent sample:\n${bodySample}`,
                  },
                ],
                { maxTokens: 10, temperature: 0 }
              );

              if (aiCheck.trim().toLowerCase().startsWith("y")) {
                results.push({
                  linkId: link.id,
                  slug: link.slug,
                  destination: link.destination,
                  status: "changed",
                  summary: `Title changed from "${link.title}" to "${currentTitle}"`,
                  cloudflare,
                });
                continue;
              }
            }
          } catch {
            // Body read failed — link is still accessible, just skip content-drift
          }
        }
      } catch {
        results.push({
          linkId: link.id,
          slug: link.slug,
          destination: link.destination,
          status: "broken",
          statusCode: 0,
          cloudflare,
        });
        continue;
      }

      results.push({
        linkId: link.id,
        slug: link.slug,
        destination: link.destination,
        status: "ok",
        statusCode,
        cloudflare,
      });
    }

    return NextResponse.json({
      checked: results.length,
      broken: results.filter((r) => r.status === "broken").length,
      changed: results.filter((r) => r.status === "changed").length,
      results,
    });
  } catch (err) {
    console.error("[POST /api/ai/check-links]", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

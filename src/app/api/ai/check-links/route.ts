import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { aiComplete } from "@/lib/ai/client";
import { submitUrlScan, getScanResult } from "@/lib/cloudflare/url-scanner";

interface CheckResult {
  linkId: string;
  slug: string;
  destination: string;
  status: "ok" | "broken" | "changed";
  statusCode?: number;
  summary?: string;
  // Cloudflare URL Scanner security verdict
  security?: {
    scanId: string;
    malicious: boolean;
    categories: string[];
    phishing: string[];
    status: "pending" | "safe" | "malicious" | "error";
  };
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
        limit: 50,
        columns: { id: true, slug: true, destination: true, title: true },
      });
    } else {
      batch = await db.query.links.findMany({
        where: eq(links.workspaceId, workspaceId),
        limit: 50,
        columns: { id: true, slug: true, destination: true, title: true },
      });
    }

    const results: CheckResult[] = [];

    for (const link of batch) {
      let statusCode = 0;

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
        });
        continue;
      }

      results.push({
        linkId: link.id,
        slug: link.slug,
        destination: link.destination,
        status: "ok",
        statusCode,
      });
    }

    // ── Cloudflare URL Scanner: submit all checked URLs for security ──────
    // Non-blocking — we submit scans and return their IDs. The client can
    // poll /api/url-scanner/result/[scanId] for verdicts asynchronously.
    // This avoids blocking the response for 30-60s while scans complete.
    let cfScannerAvailable = true;
    try {
      // Quick check that env vars are configured
      const accountId =
        process.env.CLOUDFLARE_ACCOUNT_ID ||
        process.env.CF_ACCOUNT_ID ||
        process.env.CLOUDFLARE_R2_ACCOUNT_ID;
      const token =
        process.env.CLOUDFLARE_URL_SCANNER_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
      if (!accountId || !token) cfScannerAvailable = false;
    } catch {
      cfScannerAvailable = false;
    }

    if (cfScannerAvailable) {
      // Submit all unique destinations for security scanning
      const uniqueUrls = [...new Set(results.map((r) => r.destination))];
      const scanSubmissions = await Promise.allSettled(
        uniqueUrls.slice(0, 20).map(async (url) => {
          try {
            const submission = await submitUrlScan(url, {
              visibility: "Unlisted",
            });
            return { url, uuid: submission.uuid };
          } catch {
            return { url, uuid: null };
          }
        })
      );

      // Map scan UUIDs back to results
      const urlToScanId = new Map<string, string>();
      for (const s of scanSubmissions) {
        if (s.status === "fulfilled" && s.value.uuid) {
          urlToScanId.set(s.value.url, s.value.uuid);
        }
      }

      for (const result of results) {
        const scanId = urlToScanId.get(result.destination);
        if (scanId) {
          result.security = {
            scanId,
            malicious: false,
            categories: [],
            phishing: [],
            status: "pending",
          };
        }
      }
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

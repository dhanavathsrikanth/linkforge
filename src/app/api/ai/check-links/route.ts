import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { aiComplete } from "@/lib/ai/client";

interface CheckResult {
  linkId: string;
  slug: string;
  destination: string;
  status: "ok" | "broken" | "changed";
  statusCode?: number;
  summary?: string;
}

export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const allLinks = await db.query.links.findFirst({
      where: and(eq(links.workspaceId, workspaceId), isNull(links.domainId)),
    });

    const batch = await db.query.links.findMany({
      where: eq(links.workspaceId, workspaceId),
      limit: 50,
      columns: { id: true, slug: true, destination: true, title: true },
    });

    const results: CheckResult[] = [];

    for (const link of batch) {
      let statusCode = 0;
      let bodySample = "";

      try {
        const res = await fetch(link.destination, {
          method: "HEAD",
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "LinkForge/1.0" },
        });
        statusCode = res.status;

        if (res.status >= 400) {
          results.push({
            linkId: link.id,
            slug: link.slug,
            destination: link.destination,
            status: "broken",
            statusCode: res.status,
          });
          continue;
        }

        // Content-drift check: fetch a small sample for links with a title
        if (link.title) {
          const bodyRes = await fetch(link.destination, {
            signal: AbortSignal.timeout(5000),
            headers: { "User-Agent": "LinkForge/1.0" },
          });
          if (bodyRes.ok) {
            const html = await bodyRes.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const currentTitle = titleMatch ? titleMatch[1].trim() : "";
            bodySample = html
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

import { NextResponse } from "next/server";
import { aiJson } from "@/lib/ai/client";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Fetch the page to get raw content for the AI to analyse
    let pageContent = "";
    try {
      const pageRes = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "LinkForge/1.0" },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        // Extract text from <title>, <meta>, and visible text
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(
          /<meta\s+name="description"\s+content="([^"]+)"/i
        );
        // Strip tags for a rough plain-text preview
        const bodyText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);
        pageContent = [
          titleMatch ? `Title: ${titleMatch[1]}` : "",
          descMatch ? `Description: ${descMatch[1]}` : "",
          `Content: ${bodyText}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
    } catch {
      // Best-effort — AI can still work with the URL
    }

    interface Enrichment {
      title: string;
      description: string;
      ogImage: string;
    }

    const result = await aiJson<Enrichment>(
      `You are a link-enrichment assistant. Given a URL and optional page content,
generate a short title (max 60 chars), a concise description (max 120 chars),
and a relevant ogImage URL (use an empty string if you cannot determine one).
Respond with JSON: { "title": "...", "description": "...", "ogImage": "..." }`,
      `URL: ${url}\n\n${pageContent ? `Page content:\n${pageContent}` : "No page content available — infer from the URL."}`
    );

    return NextResponse.json({
      title: result.title?.slice(0, 200) || null,
      description: result.description?.slice(0, 500) || null,
      ogImage: result.ogImage || null,
    });
  } catch (err) {
    console.error("[POST /api/ai/enrich-link]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("OPENROUTER_API_KEY")) {
      return NextResponse.json(
        { error: "AI not configured — set OPENROUTER_API_KEY" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to enrich link" }, { status: 500 });
  }
}

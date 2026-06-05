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
        headers: { "User-Agent": "PivotUrl/1.0" },
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

    // Try AI enrichment; fall back to scraped metadata if it fails
    try {
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
    } catch (aiErr) {
      console.warn("[POST /api/ai/enrich-link] AI failed, using scraped fallback:", aiErr);
    }

    // Fallback: extract from scraped page HTML (title + meta description + OG tags)
    let html = pageContent ? "" : "";
    try {
      const htmlRes = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PivotUrlBot/1.0; +https://pivoturl.com)" },
      });
      if (htmlRes.ok) html = await htmlRes.text();
    } catch {}

    const isProtected = html.includes("cf-browser-verification") || html.includes("Just a moment") || html.includes("Turnstile");

    let ogImageUrl: string | null = null;
    if (html && !isProtected) {
      const ogImg = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
        || html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
      if (ogImg) ogImageUrl = ogImg[1].slice(0, 1000);

      const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (ogTitle) {
        const desc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
        return NextResponse.json({
          title: ogTitle[1].slice(0, 200),
          description: desc?.[1]?.slice(0, 500) || null,
          ogImage: ogImageUrl,
        });
      }
    }

    // Extract from basic tags (title, meta description)
    const fallbackTitle = (() => {
      if (isProtected || !html) return null;
      const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return m?.[1]?.slice(0, 200) || null;
    })();
    const fallbackDesc = (() => {
      if (isProtected || !html) return null;
      const m = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      return m?.[1]?.slice(0, 500) || null;
    })();

    // Ultimate fallback: infer from the URL itself (domain + path segments)
    const urlTitle = (() => {
      try {
        const u = new URL(url);
        const segments = u.pathname
          .split("/")
          .filter(Boolean)
          .map((s) => s.replace(/[-_]/g, " "))
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
        const fromPath = segments.length > 0 ? segments.slice(-2).join(" - ") : null;
        return fromPath ? `${u.hostname} - ${fromPath}` : u.hostname;
      } catch { return null; }
    })();

    return NextResponse.json({
      title: fallbackTitle || urlTitle,
      description: fallbackDesc,
      ogImage: ogImageUrl,
    });
  } catch (err) {
    console.error("[POST /api/ai/enrich-link]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("CLOUDFLARE_ACCOUNT_ID") || message.includes("CLOUDFLARE_API_TOKEN")) {
      return NextResponse.json(
        { error: "AI not configured — set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to enrich link" }, { status: 500 });
  }
}

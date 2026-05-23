import { NextResponse } from "next/server";

const stopWords = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "be", "are", "was",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "shall", "not",
  "no", "nor", "so", "if", "than", "that", "this", "these", "those",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "too", "very", "just",
  "about", "above", "after", "again", "against", "below", "between",
  "into", "through", "during", "before", "after", "up", "down",
]);

function suggestSlug(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const path = url.pathname
      .replace(/\/$/, "")
      .replace(/^\//, "")
      .replace(/\.(html?|php|asp|aspx|jsp)$/i, "")
      .replace(/[-_]+/g, " ");

    const segments = path
      .split(/[/\-_ ]+/)
      .filter(Boolean)
      .map((s) => s.toLowerCase())
      .filter((s) => s.length > 1 && !/^\d+$/.test(s) && !stopWords.has(s));

    const hostParts = url.hostname
      .replace(/^www\./, "")
      .split(".")
      .filter((s) => s.length > 3 && !stopWords.has(s));

    const words = [...new Set([...segments, ...hostParts])];

    if (words.length === 0) return "";

    let slug = words.slice(0, 5).join("-");
    slug = slug.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

    if (slug.length > 50) {
      slug = slug.slice(0, 50).replace(/-[^-]*$/, "");
    }

    return slug;
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ slug: "" });
    }

    const slug = suggestSlug(url);
    return NextResponse.json({ slug });
  } catch {
    return NextResponse.json({ slug: "" });
  }
}

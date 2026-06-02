import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceTags, folders } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace } from "@/lib/db/workspace";
import { eq, desc } from "drizzle-orm";
import { aiJson } from "@/lib/ai/client";

/**
 * POST /api/ai/suggest-slug
 *
 * AI-powered link suggestion — given a URL, returns:
 *   - slug: a clean, memorable short slug (2-4 words)
 *   - title: a human-readable link title
 *   - description: a concise link description for OG previews
 *   - suggestedTags: tags to apply (ONLY from existing workspace tags)
 *   - suggestedFolder: folder to place in (ONLY from existing workspace folders)
 *
 * The AI is constrained to suggest ONLY from the user's existing tags/folders
 * to prevent tag/folder proliferation.
 *
 * Uses Cloudflare Workers AI (Llama 3.3 70B).
 * Falls back to rule-based extraction if AI fails.
 */

// ── Rule-based fallback (always works, no AI needed) ─────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "be", "are", "was",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "shall", "not",
  "no", "nor", "so", "if", "than", "that", "this", "these", "those",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "too", "very", "just",
  "about", "above", "after", "again", "against", "below", "between",
  "into", "through", "during", "before", "up", "down", "www", "com",
  "org", "net", "co", "io", "dev", "app", "html", "php", "aspx",
]);

function ruleBasedSlug(urlStr: string): string {
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
      .filter((s) => s.length > 1 && !/^\d+$/.test(s) && !STOP_WORDS.has(s));

    const hostParts = url.hostname
      .replace(/^www\./, "")
      .split(".")
      .filter((s) => s.length > 3 && !STOP_WORDS.has(s));

    const words = [...new Set([...segments, ...hostParts])];
    if (words.length === 0) return "";

    let slug = words.slice(0, 5).join("-");
    slug = slug.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (slug.length > 50) slug = slug.slice(0, 50).replace(/-[^-]*$/, "");
    return slug;
  } catch {
    return "";
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ExistingTag {
  id: string;
  name: string;
  color: string;
}

interface ExistingFolder {
  id: string;
  name: string;
}

interface Suggestion {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  folder: string | null;
}

/**
 * Fetch workspace tags and folders for the AI constraint prompt.
 */
async function getWorkspaceContext(workspaceId: string | undefined, dbUserId: string) {
  const tags: ExistingTag[] = [];
  const foldersList: ExistingFolder[] = [];

  if (!workspaceId) return { tags, folders: foldersList };

  try {
    const ws = await resolveUserWorkspace(dbUserId, workspaceId);

    const dbTags = await db
      .select({ id: workspaceTags.id, name: workspaceTags.name, color: workspaceTags.color })
      .from(workspaceTags)
      .where(eq(workspaceTags.workspaceId, ws.id))
      .orderBy(desc(workspaceTags.usageCount))
      .limit(50);

    tags.push(...dbTags);

    const dbFolders = await db
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.workspaceId, ws.id))
      .limit(30);

    foldersList.push(...dbFolders);
  } catch {
    // workspace access failed — proceed without constraints
  }

  return { tags, folders: foldersList };
}

// ── AI-powered suggestion ────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { url, workspaceId } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({
        slug: "", title: "", description: "", suggestedTags: [], suggestedFolder: null,
      });
    }

    // Fetch existing workspace tags/folders for AI constraint
    let existingTags: ExistingTag[] = [];
    let existingFolders: ExistingFolder[] = [];

    const { userId } = await auth();
    if (userId && workspaceId) {
      try {
        const dbUser = await getOrCreateDbUser();
        if (dbUser) {
          const ctx = await getWorkspaceContext(workspaceId, dbUser.id);
          existingTags = ctx.tags;
          existingFolders = ctx.folders;
        }
      } catch {
        // auth/workspace lookup failed — proceed without constraints
      }
    }

    // Build AI prompt with workspace context
    const tagNames = existingTags.map((t) => t.name);
    const folderNames = existingFolders.map((f) => f.name);

    const workspaceContextPart = tagNames.length > 0 || folderNames.length > 0
      ? `\n\nIMPORTANT — You MUST only suggest from these EXISTING workspace options:
- Available tags: [${tagNames.join(", ")}]
- Available folders: [${folderNames.join(", ")}]
Pick the most relevant tags (1-3) and folder (0-1). If nothing fits, return empty arrays. Do NOT invent new tags or folders.`
      : "";

    // Try AI first — falls back to rule-based if it fails
    try {
      const result = await aiJson<Suggestion>(
        `You are a URL-to-short-link assistant. Given a URL, generate:
1. "slug": A clean, memorable short slug (2-4 lowercase words, hyphen-separated, max 30 chars). Use descriptive words from the URL's domain and path. No numbers unless they're meaningful.
2. "title": A human-readable title for this link (max 60 chars). Infer from the URL structure.
3. "description": A concise one-sentence description (max 120 chars).
4. "tags": An array of 1-3 tag names that best describe this link's purpose.${workspaceContextPart}
5. "folder": The single best folder name to organize this link in, or null if none fits.

Examples:
- URL: https://www.nike.com/sale/summer-2025 → { "slug": "nike-summer-sale", "title": "Nike Summer Sale 2025", "description": "Shop Nike's summer 2025 clearance event with discounted shoes and apparel.", "tags": ["marketing", "sales"], "folder": "Campaigns" }
- URL: https://github.com/vercel/next.js/releases → { "slug": "nextjs-releases", "title": "Next.js Releases", "description": "Latest releases and changelog for the Next.js framework by Vercel.", "tags": ["development", "docs"], "folder": "Dev Resources" }`,
        `URL: ${url}`
      );

      // Validate & sanitize the AI response
      let slug = (result.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
      if (!slug) slug = ruleBasedSlug(url);

      // Constrain tags to only existing ones (case-insensitive match)
      const suggestedTags: string[] = [];
      if (Array.isArray(result.tags) && tagNames.length > 0) {
        const lowerTagMap = new Map(tagNames.map((n) => [n.toLowerCase(), n]));
        for (const rawTag of result.tags.slice(0, 3)) {
          const normalized = String(rawTag).toLowerCase().trim();
          const existing = lowerTagMap.get(normalized);
          if (existing) suggestedTags.push(existing);
        }
      }

      // Constrain folder to only existing ones (case-insensitive match)
      let suggestedFolder: string | null = null;
      if (result.folder && folderNames.length > 0) {
        const lowerFolderMap = new Map(folderNames.map((n) => [n.toLowerCase(), n]));
        const normalized = String(result.folder).toLowerCase().trim();
        const existing = lowerFolderMap.get(normalized);
        if (existing) suggestedFolder = existing;
      }

      return NextResponse.json({
        slug,
        title: (result.title || "").slice(0, 200),
        description: (result.description || "").slice(0, 500),
        suggestedTags,
        suggestedFolder,
      });
    } catch (err) {
      // AI failed — use rule-based fallback
      console.warn("[suggest-slug] AI failed, using rule-based fallback:", err);
      return NextResponse.json({
        slug: ruleBasedSlug(url),
        title: "",
        description: "",
        suggestedTags: [],
        suggestedFolder: null,
      });
    }
  } catch {
    return NextResponse.json({
      slug: "", title: "", description: "", suggestedTags: [], suggestedFolder: null,
    });
  }
}

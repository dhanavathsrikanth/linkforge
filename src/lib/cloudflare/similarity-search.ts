import { redis } from "@/lib/redis";

/**
 * Cloudflare Vectorize-based similarity search (Req 8).
 *
 * Uses Cloudflare Workers AI to generate embeddings from page content
 * (title, description, URL) and stores them in Vectorize for
 * true semantic similarity search using cosine similarity.
 *
 * API Reference:
 * - Vectorize v2: https://developers.cloudflare.com/api/resources/vectorize/v2/
 * - Workers AI:   https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/
 */

const CACHE_TTL_SECONDS = 36 * 60 * 60; // 36h: middle of [24h, 72h]
const VECTORIZE_INDEX = "page-embeddings";
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5"; // 768-dim, standard text embedding

function getConfig() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_URL_SCANNER_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token)
    throw new Error("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_URL_SCANNER_TOKEN");
  return { accountId, token };
}

export interface SimilarityHit {
  scanId: string;
  url: string;
  malicious: boolean;
  fetchedAt?: string;
  similarity: number; // Cosine similarity score [0-1]
}

export interface SimilarityResult {
  queryUrl: string;
  matches: SimilarityHit[];
  /** True iff at least one match has malicious=true */
  hasMalicious: boolean;
}

export interface PageEmbedding {
  scanId: string;
  url: string;
  content: string; // Combined title + description + meta for embedding
  malicious: boolean;
  fetchedAt?: string;
  createdAt: number;
}

// ─── Embedding Generation (Workers AI) ────────────────────────────────────────

/**
 * Generate a 768-dim embedding for page content using Workers AI.
 * Model: @cf/baai/bge-base-en-v1.5
 *
 * Response shape (CF Workers AI REST):
 *   { success: true, result: { data: number[] | number[][], shape: [768] } }
 */
export async function generateEmbedding(content: string): Promise<number[] | null> {
  try {
    const { accountId, token } = getConfig();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBEDDING_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      }
    );

    if (!response.ok) {
      console.warn("[similarity-search] embedding generation failed", response.status);
      return null;
    }

    const json = (await response.json()) as {
      success?: boolean;
      result?: { data?: number[] | number[][] };
    };

    // Workers AI returns result.data as either:
    //   - a flat number[] (single input) or
    //   - a number[][] (batch input)
    const raw = json.result?.data;
    if (!raw) return null;

    if (Array.isArray(raw) && raw.length > 0) {
      if (typeof raw[0] === "number") return raw as number[];
      if (Array.isArray(raw[0])) return (raw as number[][])[0];
    }

    return null;
  } catch (err) {
    console.warn("[similarity-search] embedding generation error", err);
    return null;
  }
}

// ─── Content Builder ──────────────────────────────────────────────────────────

/**
 * Build search text from page metadata for embedding generation.
 * Combines title, description, and URL parts into a rich text signal.
 */
function buildSearchContent(
  title?: string | null,
  description?: string | null,
  url?: string
): string {
  const parts: string[] = [];
  if (title) parts.push(title);
  if (description) parts.push(description);
  if (url) {
    try {
      const u = new URL(url);
      parts.push(u.hostname);
      if (u.pathname && u.pathname !== "/") parts.push(u.pathname);
    } catch {
      // Invalid URL, skip URL parts
    }
  }
  return parts.join(" | ");
}

// ─── Store Embedding (Vectorize v2) ──────────────────────────────────────────

/**
 * Store a page embedding in Vectorize for future similarity searches.
 * Should be called after a successful URL scan.
 *
 * Vectorize v2 insert body:
 *   { vectors: [{ id: string, values: number[], metadata: Record }] }
 */
export async function storePageEmbedding(data: {
  scanId: string;
  url: string;
  title?: string | null;
  description?: string | null;
  malicious: boolean;
  fetchedAt?: string;
}): Promise<boolean> {
  const content = buildSearchContent(data.title, data.description, data.url);
  if (!content.trim()) {
    console.warn("[similarity-search] no content to embed");
    return false;
  }

  const embedding = await generateEmbedding(content);
  if (!embedding) {
    return false;
  }

  try {
    const { accountId, token } = getConfig();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/insert`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vectors: [
            {
              id: data.scanId,
              values: embedding,
              metadata: {
                url: data.url,
                malicious: data.malicious ? 1 : 0, // Vectorize metadata values must be numeric
                fetchedAt: data.fetchedAt ?? "",
                createdAt: Date.now(),
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.warn("[similarity-search] vectorize insert failed", response.status);
      return false;
    }

    // Also cache locally in Redis for fast lookups
    const cacheKey = `urlscanner:embed:${data.scanId}`;
    await redis.set(
      cacheKey,
      JSON.stringify({ ...data, content, createdAt: Date.now() }),
      { ex: CACHE_TTL_SECONDS * 2 }
    );

    return true;
  } catch (err) {
    console.warn("[similarity-search] vectorize error", err);
    return false;
  }
}

// ─── Delete Embedding (Vectorize v2) ─────────────────────────────────────────

/**
 * Delete a page embedding from Vectorize (when scan is removed).
 */
export async function deletePageEmbedding(scanId: string): Promise<boolean> {
  try {
    const { accountId, token } = getConfig();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/deleteByIds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [scanId] }),
      }
    );

    // Clean up Redis cache
    await redis.del(`urlscanner:embed:${scanId}`);

    return response.ok;
  } catch (err) {
    console.warn("[similarity-search] vectorize delete error", err);
    return false;
  }
}

// ─── Similarity Query (Vectorize v2) ─────────────────────────────────────────

/**
 * Search Vectorize for pages similar to the given URL using cosine similarity.
 *
 * @param opts.url           - The URL to find similar pages for
 * @param opts.title         - Page title (optional, enriches embedding)
 * @param opts.description   - Page description (optional, enriches embedding)
 * @param opts.limit         - Max results to return (default 10)
 * @param opts.minSimilarity - Minimum cosine similarity score [0-1], default 0.75
 *
 * Vectorize v2 query body:
 *   { vector: number[], topK: number, returnMetadata: "all"|"indexed"|"none" }
 *
 * Vectorize v2 query response:
 *   { result: { matches: [{ id, score, values?, metadata }] } }
 */
export async function findSimilarPages(opts: {
  url: string;
  title?: string | null;
  description?: string | null;
  limit?: number;
  minSimilarity?: number;
}): Promise<SimilarityResult | null> {
  const { url, title, description, limit = 10, minSimilarity = 0.75 } = opts;

  // ── Redis cache check ────────────────────────────────────────────────
  const cacheKey = `urlscanner:sim:${Buffer.from(url).toString("base64").slice(0, 32)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return typeof cached === "string"
        ? (JSON.parse(cached) as SimilarityResult)
        : (cached as SimilarityResult);
    }
  } catch {
    // Redis miss is fine
  }

  // ── Generate embedding for query ──────────────────────────────────────
  const content = buildSearchContent(title, description, url);
  const embedding = await generateEmbedding(content);
  if (!embedding) {
    return null; // No embedding → no similarity search possible
  }

  // ── Query Vectorize v2 ────────────────────────────────────────────────
  try {
    const { accountId, token } = getConfig();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vector: embedding,
          topK: limit,
          returnMetadata: "all",
        }),
      }
    );

    if (!response.ok) {
      console.warn("[similarity-search] vectorize query failed", response.status);
      return null;
    }

    const json = (await response.json()) as {
      result?: {
        matches?: Array<{
          id: string;
          score: number;
          metadata?: Record<string, unknown>;
        }>;
      };
    };

    const results = json.result?.matches ?? [];

    const matches: SimilarityHit[] = results
      .filter((r) => r.score >= minSimilarity)
      .map((r) => ({
        scanId: r.id,
        url: String(r.metadata?.url ?? ""),
        malicious: r.metadata?.malicious === 1, // Stored as 0/1 in metadata
        fetchedAt: r.metadata?.fetchedAt
          ? String(r.metadata.fetchedAt)
          : undefined,
        similarity: r.score,
      }))
      .filter((m) => m.url && m.url !== url); // Exclude self-matches

    const result: SimilarityResult = {
      queryUrl: url,
      matches,
      hasMalicious: matches.some((m) => m.malicious),
    };

    // ── Cache result ──────────────────────────────────────────────────────
    try {
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
    } catch {
      // Ignore cache errors
    }

    return result;
  } catch (err) {
    console.warn("[similarity-search] vectorize query error", err);
    return null;
  }
}

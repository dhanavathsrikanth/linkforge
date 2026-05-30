import { redis } from "@/lib/redis";

/**
 * Cloudflare URL Scanner similarity search (Req 8).
 *
 * Calls the Search Scans endpoint with hash queries to find scans that share
 * structure (DOM hash) or look identical (screenshot hash) — common phishing
 * kit detection signals.
 *
 * API: GET /accounts/{id}/urlscanner/v2/search?q=<elasticsearch-query>
 * Docs: https://developers.cloudflare.com/api/resources/url_scanner/subresources/scans/methods/list/
 *
 * Cached by hash with TTL ∈ [24h, 72h] (Req 24.1) — the underlying corpus
 * doesn't change quickly so a stale match is still a match.
 */

const CF_BASE = "https://api.cloudflare.com/client/v4";
const CACHE_TTL_SECONDS = 36 * 60 * 60; // 36h: middle of [24h, 72h]

function getConfig() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_URL_SCANNER_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_URL_SCANNER_TOKEN");
  return { accountId, token };
}

export interface SimilarityHit {
  scanId: string;
  url: string;
  malicious: boolean;
  fetchedAt?: string;
}

export interface SimilarityResult {
  hash: string;
  matches: SimilarityHit[];
  /** True iff at least one match has malicious=true */
  hasMalicious: boolean;
}

/**
 * Search Cloudflare for scans whose DOM structure hash matches `domStructHash`,
 * OR whose primary screenshot hash matches `screenshotHash` — whichever is
 * provided. Results are cached in Redis under `urlscanner:sim:<hash>`.
 *
 * Returns null when scanner isn't configured or the search fails — callers
 * should treat that as "no similarity signal", not a verdict change.
 */
export async function findSimilarScans(opts: {
  domStructHash?: string | null;
  screenshotHash?: string | null;
}): Promise<SimilarityResult | null> {
  const hash = opts.domStructHash || opts.screenshotHash;
  if (!hash) return null;

  // Cache check
  const cacheKey = `urlscanner:sim:${hash}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return typeof cached === "string"
        ? (JSON.parse(cached) as SimilarityResult)
        : (cached as SimilarityResult);
    }
  } catch {
    // Redis miss is fine — fall through to a real call
  }

  let config: { accountId: string; token: string };
  try {
    config = getConfig();
  } catch {
    return null;
  }

  // Build a hash query — Cloudflare's search uses a subset of ElasticSearch
  // query syntax. `hash:<value>` matches both DOM struct and screenshot
  // hashes since they all live under the `hash` keyword.
  const q = `hash:${hash}`;
  const url = new URL(
    `${CF_BASE}/accounts/${config.accountId}/urlscanner/v2/search`
  );
  url.searchParams.set("q", q);
  url.searchParams.set("size", "25"); // cap server-side per the `size` query param

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${config.token}` },
    });
  } catch (err) {
    console.warn("[similarity-search] network error", err);
    return null;
  }

  if (!response.ok) {
    console.warn(
      "[similarity-search] non-2xx",
      response.status,
      await response.text().catch(() => "")
    );
    return null;
  }

  const json = await response.json();

  // Actual response shape per the API docs:
  // { results: [ { _id, task: { uuid, url, time, visibility }, page: { url, ip, asn, country }, verdicts: { malicious }, ... } ] }
  // Note: top-level `results` array, NOT `result.tasks`.
  const items = (json?.results ?? []) as Array<Record<string, unknown>>;

  const matches: SimilarityHit[] = items.slice(0, 25).map((item) => {
    const task = (item.task as Record<string, unknown>) ?? {};
    const verdicts = (item.verdicts as Record<string, unknown>) ?? {};
    const page = (item.page as Record<string, unknown>) ?? {};
    return {
      scanId: String(task.uuid ?? item._id ?? ""),
      // Prefer the final page URL; fall back to the submitted task URL
      url: String(page.url ?? task.url ?? ""),
      // `verdicts.malicious` is a direct boolean (not nested under `overall`)
      malicious: verdicts.malicious === true,
      fetchedAt: typeof task.time === "string" ? (task.time as string) : undefined,
    };
  });

  const result: SimilarityResult = {
    hash,
    matches,
    hasMalicious: matches.some((m) => m.malicious),
  };

  // Cache (fire-and-forget)
  try {
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
  } catch {
    /* ignore */
  }

  return result;
}

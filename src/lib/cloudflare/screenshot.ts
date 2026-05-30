/**
 * Fetch a screenshot for a Cloudflare URL Scanner scan.
 *
 * API: GET /accounts/{id}/urlscanner/v2/screenshots/{scan_id}.png
 * Docs: https://developers.cloudflare.com/api/resources/url_scanner/subresources/scans/methods/screenshot/
 *
 * Returns the raw PNG bytes (lossless — Cloudflare emits the exact image
 * captured by the headless browser). We don't re-encode: PNG already uses
 * lossless deflate compression and any further pipeline would either lose
 * pixels (JPEG/WebP-lossy) or require a heavy native dependency. Storing
 * `bytea` in Postgres is the smallest representation we can keep without
 * touching the pixels.
 *
 * Retries once with exponential backoff per Req 6.4. Returns null when
 * the scanner isn't configured or the screenshot is unavailable.
 */

const CF_BASE = "https://api.cloudflare.com/client/v4";
const MAX_ATTEMPTS = 3;

function getConfig() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_URL_SCANNER_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) return null;
  return { accountId, token };
}

export interface ScreenshotResult {
  bytes: Buffer;
  mimeType: string;
  sizeBytes: number;
}

export async function fetchScanScreenshot(
  scanId: string,
  resolution: "desktop" | "mobile" | "tablet" = "desktop"
): Promise<ScreenshotResult | null> {
  const config = getConfig();
  if (!config) return null;

  const url =
    `${CF_BASE}/accounts/${config.accountId}` +
    `/urlscanner/v2/screenshots/${scanId}.png` +
    (resolution !== "desktop" ? `?resolution=${encodeURIComponent(resolution)}` : "");

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${config.token}` },
      });

      if (res.status === 404) {
        // No screenshot for this scan — not a retry-able error
        return null;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const mime = res.headers.get("content-type") ?? "image/png";

      return { bytes: buf, mimeType: mime, sizeBytes: buf.byteLength };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        const backoff = 500 * Math.pow(2, attempt - 1); // 500ms, 1s
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  console.warn(
    `[fetchScanScreenshot] failed for ${scanId} after ${MAX_ATTEMPTS} attempts:`,
    lastErr
  );
  return null;
}

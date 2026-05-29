/**
 * Cloudflare URL Scanner API client.
 *
 * Docs: https://developers.cloudflare.com/radar/investigate/url-scanner/
 * API:  https://developers.cloudflare.com/api/resources/url_scanner/
 *
 * Requires:
 *   - CLOUDFLARE_URL_SCANNER_TOKEN: API token with Account > URL Scanner > Edit
 *   - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 *
 * The URL Scanner provides:
 *   - Malicious content detection (phishing, malware, etc.)
 *   - Technology fingerprinting
 *   - Domain categorization
 *   - Screenshot capture
 *   - Full request chain analysis
 *   - TLS certificate inspection
 */

const CF_BASE = "https://api.cloudflare.com/client/v4";

function getConfig() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const token =
    process.env.CLOUDFLARE_URL_SCANNER_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !token) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_URL_SCANNER_TOKEN env vars"
    );
  }
  return { accountId, token };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanSubmitResponse {
  uuid: string;
  api: string;
  visibility: string;
  url: string;
  message: string;
}

export interface ScanVerdict {
  malicious: boolean;
  categories?: string[];
  phishing?: string[];
}

export interface ScanPageInfo {
  url: string;
  domain: string;
  ip: string;
  asn: string;
  asnName: string;
  country: string;
  server: string;
  status: number;
}

export interface ScanTechnology {
  name: string;
  categories: string[];
  confidence: number;
}

export interface ScanResult {
  uuid: string;
  status: "Queued" | "InProgress" | "Finished" | "Failed";
  success: boolean;
  url: string;
  submittedUrl: string;
  verdicts: {
    overall: ScanVerdict;
    engines?: Record<string, ScanVerdict>;
  };
  page: ScanPageInfo;
  categories: string[];
  technologies: ScanTechnology[];
  certificates: Array<{
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
  }>;
  // Simplified — full response has much more
  raw?: unknown;
}

// ─── Submit a URL for scanning ────────────────────────────────────────────────

export async function submitUrlScan(
  url: string,
  options?: {
    visibility?: "Public" | "Unlisted";
    screenshotResolutions?: ("desktop" | "mobile" | "tablet")[];
    customUserAgent?: string;
  }
): Promise<ScanSubmitResponse> {
  const { accountId, token } = getConfig();

  const body: Record<string, unknown> = { url };
  if (options?.visibility) body.visibility = options.visibility;
  if (options?.screenshotResolutions)
    body.screenshotsResolutions = options.screenshotResolutions;
  if (options?.customUserAgent) body.customagent = options.customUserAgent;

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/urlscanner/v2/scan`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Cloudflare URL Scanner submit failed (${res.status}): ${errBody}`
    );
  }

  const json = await res.json();
  // The response shape is { success, result: { uuid, api, visibility, url, message } }
  if (json.result) return json.result as ScanSubmitResponse;
  return json as ScanSubmitResponse;
}

// ─── Get scan result ──────────────────────────────────────────────────────────

export async function getScanResult(scanId: string): Promise<ScanResult | null> {
  const { accountId, token } = getConfig();

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/urlscanner/v2/result/${scanId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  // 404 means scan is still in progress
  if (res.status === 404) return null;

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Cloudflare URL Scanner result failed (${res.status}): ${errBody}`
    );
  }

  const json = await res.json();
  const data = json.result ?? json;

  // Normalize into our simplified shape
  const task = data.task ?? {};
  const page = data.page ?? {};
  const meta = data.meta?.processors ?? {};
  const verdicts = data.verdicts ?? {};
  const lists = data.lists ?? {};

  const technologies: ScanTechnology[] = (meta.wappa ?? []).map(
    (t: { app: string; categories: string[]; confidence: number }) => ({
      name: t.app,
      categories: t.categories ?? [],
      confidence: t.confidence ?? 0,
    })
  );

  const certificates = (lists.certificates ?? []).map(
    (c: { issuer: string; subjectName: string; validFrom: number; validTo: number }) => ({
      issuer: c.issuer ?? "",
      subject: c.subjectName ?? "",
      validFrom: c.validFrom ? new Date(c.validFrom * 1000).toISOString() : "",
      validTo: c.validTo ? new Date(c.validTo * 1000).toISOString() : "",
    })
  );

  return {
    uuid: task.uuid ?? scanId,
    status: task.status ?? "Finished",
    success: task.success ?? true,
    url: page.url ?? task.url ?? "",
    submittedUrl: task.url ?? "",
    verdicts: {
      overall: {
        malicious: verdicts.overall?.malicious ?? false,
        categories: verdicts.overall?.categories ?? [],
        phishing: meta.phishing ?? [],
      },
      engines: verdicts.engines,
    },
    page: {
      url: page.url ?? "",
      domain: page.domain ?? "",
      ip: page.ip ?? "",
      asn: page.asn ?? "",
      asnName: page.asnName ?? "",
      country: page.country ?? "",
      server: page.server ?? "",
      status: page.status ?? 0,
    },
    categories: meta.domainCategories?.map((c: { name: string }) => c.name) ?? [],
    technologies,
    certificates,
    raw: data,
  };
}

// ─── Poll for scan completion ─────────────────────────────────────────────────

/**
 * Submit a URL and poll until the scan finishes (or timeout).
 * Returns the full result or null if it timed out.
 */
export async function scanUrlAndWait(
  url: string,
  options?: {
    visibility?: "Public" | "Unlisted";
    timeoutMs?: number;
    pollIntervalMs?: number;
  }
): Promise<ScanResult | null> {
  const timeout = options?.timeoutMs ?? 60_000;
  const interval = options?.pollIntervalMs ?? 10_000;

  const submission = await submitUrlScan(url, {
    visibility: options?.visibility ?? "Unlisted",
  });

  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));
    const result = await getScanResult(submission.uuid);
    if (result && result.status === "Finished") return result;
    if (result && result.status === "Failed") return result;
  }

  // Timed out — return whatever we have
  return getScanResult(submission.uuid);
}

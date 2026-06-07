/**
 * Cloudflare URL Scanner API client.
 *
 * Docs: https://developers.cloudflare.com/radar/investigate/url-scanner/
 * API:  https://developers.cloudflare.com/api/resources/url_scanner/
 *
 * This client extracts as much of the report payload as we can use:
 *   - task / page / verdicts
 *   - meta.processors (domainCategories, phishing, radarRank, wappa)
 *   - data.requests / data.cookies / data.globals / data.console / data.performance
 *   - lists.ips / lists.asns / lists.domains / lists.certificates / lists.hashes
 *   - page.history (redirect chain)
 *
 * Everything is normalized into a single `ScanResult` shape so callers don't
 * need to know the Cloudflare wire format. The original `raw` payload is
 * still attached so we can re-derive new fields without re-fetching.
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
  /** Public URL to the scan report on Cloudflare Radar */
  result: string;
  /** Canonical form of the submitted URL */
  url: string;
  message: string;
  /** Lowercase in the response: "public" | "unlisted" */
  visibility: "public" | "unlisted";
  options?: { useragent?: string };
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
  title?: string;
}

export interface ScanTechnology {
  name: string;
  categories: string[];
  confidence: number;
  version?: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  ip?: string;
  country?: string;
}

export interface CookiesSummary {
  total: number;
  thirdParty: number;
  domains: string[];
}

export interface GlobalsSummary {
  total: number;
  /** Names that appear suspicious (matched against an external watchlist) */
  suspicious: string[];
}

export interface ConsoleSummary {
  errors: number;
  warnings: number;
}

export interface PerformanceMetrics {
  ttfbMs?: number;
  fcpMs?: number;
  loadMs?: number;
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
  /** Cloudflare Radar Rank of the main hostname (1 = most popular) */
  radarRank: number | null;
  /** DOM structure hash — used for similarity search */
  domStructHash: string | null;
  /** First screenshot hash — used for similarity search */
  screenshotHash: string | null;
  /** Favicon MD5 — used for similarity search */
  faviconHash: string | null;
  /** Ordered list of HTTP redirects from the submitted URL to the final URL */
  redirectChain: RedirectHop[];
  categories: string[];
  technologies: ScanTechnology[];
  contactedIps: string[];
  contactedAsns: { asn: string; name?: string }[];
  contactedDomains: string[];
  certificates: Array<{
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
  }>;
  performance: PerformanceMetrics;
  cookies: CookiesSummary;
  globals: GlobalsSummary;
  console: ConsoleSummary;
  /** Original Cloudflare payload — kept for forward-compat */
  raw?: unknown;
}

// ─── Submit a URL for scanning ────────────────────────────────────────────────

export async function submitUrlScan(
  url: string,
  options?: {
    /** "Public" = appears in recent scans / search. "Unlisted" = ID-only access. */
    visibility?: "Public" | "Unlisted";
    screenshotResolutions?: ("desktop" | "mobile" | "tablet")[];
    customUserAgent?: string;
    /** ISO 3166-1 alpha-2 country code to geo-egress the scan from (Enterprise only). */
    country?: string;
    customHeaders?: Record<string, string>;
    referer?: string;
  }
): Promise<ScanSubmitResponse> {
  const { accountId, token } = getConfig();

  const body: Record<string, unknown> = { url };
  if (options?.visibility) body.visibility = options.visibility;
  if (options?.screenshotResolutions)
    body.screenshotsResolutions = options.screenshotResolutions;
  if (options?.customUserAgent) body.customagent = options.customUserAgent;
  if (options?.country) body.country = options.country;
  if (options?.customHeaders) body.customHeaders = options.customHeaders;
  if (options?.referer) body.referer = options.referer;

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

  // Response is a flat object — uuid, api, result, url, message, visibility
  // are all top-level. There is NO `result` wrapper here (unlike getScanResult).
  return (await res.json()) as ScanSubmitResponse;
}

// ─── Bulk submit (up to 100 URLs) ────────────────────────────────────────────

/**
 * Bulk scan submission (POST /v2/bulk).
 *
 * Submits up to 100 URLs in a single request. Bulk scans have lower priority
 * than single scans and may take longer to finish.
 *
 * Response is a top-level array — one entry per submitted URL. Each entry
 * has `uuid`, `api`, `result`, `url`, `visibility`, and optional `options`.
 * Note: no `message` field (unlike the single-submit endpoint).
 */
export interface BulkScanItem {
  uuid: string;
  api: string;
  /** Public URL to the scan report on Cloudflare Radar */
  result: string;
  /** Canonical form of the submitted URL */
  url: string;
  visibility: "public" | "unlisted";
  options?: { useragent?: string };
}

export interface BulkScanRequest {
  url: string;
  visibility?: "Public" | "Unlisted";
  screenshotsResolutions?: ("desktop" | "mobile" | "tablet")[];
  customagent?: string;
  customHeaders?: Record<string, string>;
  referer?: string;
}

export async function submitBulkUrlScan(
  items: BulkScanRequest[]
): Promise<BulkScanItem[]> {
  if (items.length === 0) return [];
  if (items.length > 100) {
    throw new Error("Bulk scan limit is 100 URLs per request");
  }

  const { accountId, token } = getConfig();

  const res = await fetch(
    `${CF_BASE}/accounts/${accountId}/urlscanner/v2/bulk`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(items),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Cloudflare URL Scanner bulk submit failed (${res.status}): ${errBody}`
    );
  }

  // Response is a top-level array — NOT wrapped in an object.
  return (await res.json()) as BulkScanItem[];
}

/** A small list of JS globals commonly set by malware / cryptominers. */
const SUSPICIOUS_GLOBALS = new Set([
  "_0x", // common minified malware sigil
  "CoinHive",
  "CryptoLoot",
  "deepMiner",
  "JSEcoin",
  "minerthing",
  "NFWebMiner",
  "Coinhave",
  "Webminerpool",
]);

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

  // ── Top-level groups ────────────────────────────────────────────────────
  const task = (data.task ?? {}) as Record<string, unknown>;
  const scanStatus = (task.status as string) ?? "Finished";

  // Queued / InProgress means the scan hasn't finished yet — treat the
  // same as a 404 so callers see "still in progress" rather than
  // attempting to persist partial/incomplete data.
  if (scanStatus === "Queued" || scanStatus === "InProgress") {
    return null;
  }
  const page = (data.page ?? {}) as Record<string, unknown>;
  const meta = ((data.meta as Record<string, unknown>)?.processors ?? {}) as Record<string, unknown>;
  const verdicts = (data.verdicts ?? {}) as Record<string, unknown>;
  const lists = (data.lists ?? {}) as Record<string, unknown>;
  const dataBlock = (data.data ?? {}) as Record<string, unknown>;

  // ── Technologies (Wappalyzer) ───────────────────────────────────────────
  const technologies: ScanTechnology[] = (
    (meta.wappa as Array<Record<string, unknown>>) ?? []
  ).map((t) => ({
    name: String(t.app ?? ""),
    categories: (t.categories as string[]) ?? [],
    confidence: typeof t.confidence === "number" ? t.confidence : 0,
    version: typeof t.version === "string" ? t.version : undefined,
  }));

  // ── Certificates (lists.certificates) ───────────────────────────────────
  const certificates = (
    (lists.certificates as Array<Record<string, unknown>>) ?? []
  ).map((c) => ({
    issuer: String(c.issuer ?? ""),
    subject: String(c.subjectName ?? ""),
    validFrom:
      typeof c.validFrom === "number"
        ? new Date(c.validFrom * 1000).toISOString()
        : "",
    validTo:
      typeof c.validTo === "number"
        ? new Date(c.validTo * 1000).toISOString()
        : "",
  }));

  // ── Redirect chain (page.history) ───────────────────────────────────────
  const history = (page.history as Array<Record<string, unknown>>) ?? [];
  const redirectChain: RedirectHop[] = history.map((h) => {
    const req = (h.request as Record<string, unknown>) ?? {};
    const reqInner = (req.request as Record<string, unknown>) ?? req;
    const respWrap = (h.response as Record<string, unknown>) ?? {};
    const resp = (respWrap.response as Record<string, unknown>) ?? respWrap;
    return {
      url: String(reqInner.url ?? respWrap.url ?? ""),
      status: typeof resp.status === "number" ? (resp.status as number) : 0,
      ip: typeof respWrap.remoteIPAddress === "string" ? (respWrap.remoteIPAddress as string) : undefined,
      country: typeof respWrap.geoip === "object" && respWrap.geoip !== null
        ? ((respWrap.geoip as Record<string, unknown>).country as string | undefined)
        : undefined,
    };
  });

  // ── Contacted lists ─────────────────────────────────────────────────────
  const contactedIps: string[] = ((lists.ips as Array<Record<string, unknown>>) ?? [])
    .map((i) => (typeof i === "string" ? i : (i.ip as string) ?? ""))
    .filter(Boolean);

  const contactedAsns: { asn: string; name?: string }[] = (
    (lists.asns as Array<Record<string, unknown>>) ?? []
  )
    .map((a) => ({
      asn: typeof a === "string" ? a : String(a.asn ?? ""),
      name: typeof a === "object" ? (a.name as string | undefined) : undefined,
    }))
    .filter((a) => a.asn);

  const contactedDomains: string[] = ((lists.domains as Array<Record<string, unknown>>) ?? [])
    .map((d) => (typeof d === "string" ? d : String(d.domain ?? d.name ?? "")))
    .filter(Boolean);

  // ── Performance (data.performance) ──────────────────────────────────────
  const perfRaw = (dataBlock.performance as Record<string, unknown>) ?? {};
  const performance: PerformanceMetrics = {
    ttfbMs:
      typeof perfRaw.responseStart === "number"
        ? Math.round((perfRaw.responseStart as number) - ((perfRaw.requestStart as number) ?? 0))
        : undefined,
    fcpMs:
      typeof perfRaw.firstContentfulPaint === "number"
        ? Math.round(perfRaw.firstContentfulPaint as number)
        : undefined,
    loadMs:
      typeof perfRaw.loadEventEnd === "number"
        ? Math.round((perfRaw.loadEventEnd as number) - ((perfRaw.navigationStart as number) ?? 0))
        : undefined,
  };

  // ── Cookies (data.cookies) ──────────────────────────────────────────────
  const cookieList = ((dataBlock.cookies as Array<Record<string, unknown>>) ?? []);
  const submittedHost = (() => {
    try {
      return new URL(String(task.url ?? "")).hostname;
    } catch {
      return "";
    }
  })();
  const cookieDomains = new Set<string>();
  let thirdPartyCookies = 0;
  for (const c of cookieList) {
    const dom = typeof c.domain === "string" ? (c.domain as string) : "";
    if (dom) cookieDomains.add(dom.replace(/^\./, ""));
    if (
      submittedHost &&
      dom &&
      !submittedHost.endsWith(dom.replace(/^\./, "")) &&
      !dom.replace(/^\./, "").endsWith(submittedHost)
    ) {
      thirdPartyCookies++;
    }
  }
  const cookies: CookiesSummary = {
    total: cookieList.length,
    thirdParty: thirdPartyCookies,
    domains: Array.from(cookieDomains).slice(0, 50),
  };

  // ── Globals (data.globals) ──────────────────────────────────────────────
  const globalsList = ((dataBlock.globals as Array<Record<string, unknown> | string>) ?? []);
  const suspiciousGlobals: string[] = [];
  for (const g of globalsList) {
    const name = typeof g === "string" ? g : String(g.prop ?? g.name ?? "");
    if (!name) continue;
    for (const flag of SUSPICIOUS_GLOBALS) {
      if (name.toLowerCase().includes(flag.toLowerCase())) {
        suspiciousGlobals.push(name);
        break;
      }
    }
  }
  const globals: GlobalsSummary = {
    total: globalsList.length,
    suspicious: suspiciousGlobals.slice(0, 25),
  };

  // ── Console (data.console) ──────────────────────────────────────────────
  const consoleList = ((dataBlock.console as Array<Record<string, unknown>>) ?? []);
  let consoleErrors = 0;
  let consoleWarnings = 0;
  for (const c of consoleList) {
    const level = String((c.message as Record<string, unknown>)?.level ?? c.level ?? "").toLowerCase();
    if (level === "error") consoleErrors++;
    else if (level === "warning") consoleWarnings++;
  }
  const consoleSummary: ConsoleSummary = {
    errors: consoleErrors,
    warnings: consoleWarnings,
  };

  // ── Hashes ──────────────────────────────────────────────────────────────
  const screenshot = (page.screenshot as Record<string, unknown>) ?? {};
  const favicon = (page.favicon as Record<string, unknown>) ?? {};

  return {
    uuid: String(task.uuid ?? scanId),
    status: (task.status as ScanResult["status"]) ?? "Finished",
    success: task.success !== false,
    url: String((page.url as string | undefined) ?? task.url ?? ""),
    submittedUrl: String(task.url ?? ""),
    verdicts: {
      overall: {
        malicious: ((verdicts.overall as Record<string, unknown>)?.malicious as boolean) ?? false,
        categories: ((verdicts.overall as Record<string, unknown>)?.categories as string[]) ?? [],
        phishing: (meta.phishing as string[]) ?? [],
      },
      engines: (verdicts.engines as Record<string, ScanVerdict>) ?? undefined,
    },
    page: {
      url: String(page.url ?? ""),
      domain: String(page.domain ?? ""),
      ip: String(page.ip ?? ""),
      asn: String(page.asn ?? ""),
      asnName: String(page.asnName ?? ""),
      country: String(page.country ?? ""),
      server: String(page.server ?? ""),
      status: typeof page.status === "number" ? (page.status as number) : 0,
      title: typeof page.title === "string" ? (page.title as string) : undefined,
    },
    radarRank: typeof meta.radarRank === "number" ? (meta.radarRank as number) : null,
    domStructHash: typeof page.domStructHash === "string" ? (page.domStructHash as string) : null,
    screenshotHash: typeof screenshot.hash === "string" ? (screenshot.hash as string) : null,
    faviconHash: typeof favicon.hash === "string" ? (favicon.hash as string) : null,
    redirectChain,
    categories:
      ((meta.domainCategories as Array<Record<string, unknown>>) ?? [])
        .map((c) => String(c.name ?? ""))
        .filter(Boolean),
    technologies,
    contactedIps,
    contactedAsns,
    contactedDomains,
    certificates,
    performance,
    cookies,
    globals,
    console: consoleSummary,
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

  return getScanResult(submission.uuid);
}

/**
 * Fetch the rendered DOM for a finished scan.
 *
 * API: GET /accounts/{id}/urlscanner/v2/dom/{scan_id}
 * Returns plain text — the full HTML as rendered by Chrome (post-JS execution).
 * This is the actual DOM, not the raw source, so dynamically injected content
 * is included.
 *
 * We don't store the full DOM (can be several MB). Instead we run a quick
 * analysis pass and store the results as structured fields on the scan report.
 *
 * Returns null when the scanner isn't configured or the DOM isn't available.
 */
export async function getScanDom(scanId: string): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const res = await fetch(
    `${CF_BASE}/accounts/${config.accountId}/urlscanner/v2/dom/${scanId}`,
    {
      headers: { Authorization: `Bearer ${config.token}` },
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn(`[getScanDom] HTTP ${res.status} for scan ${scanId}`);
    return null;
  }

  return res.text();
}

/**
 * Lightweight DOM analysis — runs on the rendered HTML string without
 * parsing the full DOM tree (no jsdom dependency).
 *
 * Detects:
 *   - Hidden iframes (src present, display:none or visibility:hidden)
 *   - Password input fields (phishing indicator on non-login pages)
 *   - Obfuscated script patterns (eval, atob, unescape, String.fromCharCode)
 *   - Suspicious meta redirects
 *   - External form actions (form posts to a different domain)
 *   - Crypto wallet address patterns (ETH/BTC)
 */
export interface DomAnalysis {
  hiddenIframes: number;
  passwordInputs: number;
  obfuscatedScripts: number;
  metaRedirects: number;
  externalFormActions: string[];
  cryptoAddressPatterns: number;
  /** True when any of the above counts exceed safe thresholds */
  suspicious: boolean;
}

export function analyzeDom(html: string, primaryDomain?: string): DomAnalysis {
  const lower = html.toLowerCase();

  // Hidden iframes
  const hiddenIframes = (
    html.match(/<iframe[^>]+src=[^>]+(display\s*:\s*none|visibility\s*:\s*hidden)/gi) ?? []
  ).length;

  // Password inputs
  const passwordInputs = (html.match(/type\s*=\s*["']?password["']?/gi) ?? []).length;

  // Obfuscation patterns
  const obfuscatedScripts = [
    /\beval\s*\(/gi,
    /\batob\s*\(/gi,
    /\bunescape\s*\(/gi,
    /String\.fromCharCode\s*\(/gi,
  ].reduce((n, re) => n + (html.match(re) ?? []).length, 0);

  // Meta redirects
  const metaRedirects = (
    html.match(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]+url\s*=/gi) ?? []
  ).length;

  // External form actions
  const formActionMatches = html.matchAll(/action\s*=\s*["']([^"']+)["']/gi);
  const externalFormActions: string[] = [];
  for (const m of formActionMatches) {
    const action = m[1];
    if (!action.startsWith("/") && !action.startsWith("#")) {
      try {
        const host = new URL(action).hostname;
        if (primaryDomain && !host.endsWith(primaryDomain) && host !== primaryDomain) {
          externalFormActions.push(action.slice(0, 120));
        }
      } catch {
        /* relative or malformed — skip */
      }
    }
  }

  // Crypto wallet patterns (ETH 0x..., BTC 1... or 3... or bc1...)
  const cryptoAddressPatterns = (
    html.match(/\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g) ?? []
  ).length;

  const suspicious =
    hiddenIframes > 0 ||
    obfuscatedScripts > 3 ||
    metaRedirects > 0 ||
    externalFormActions.length > 0 ||
    cryptoAddressPatterns > 0;

  return {
    hiddenIframes,
    passwordInputs,
    obfuscatedScripts,
    metaRedirects,
    externalFormActions: externalFormActions.slice(0, 10),
    cryptoAddressPatterns,
    suspicious,
  };
}

/**
 * HAR 1.2 types — subset of the full spec we actually use.
 * Full spec: http://www.softwareishard.com/blog/har-12-spec/
 */
export interface HarHeader {
  name: string;
  value: string;
}

export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarHeader[];
  headersSize: number;
  bodySize: number;
}

export interface HarResponseContent {
  mimeType: string;
  size: number;
  compression?: number;
}

export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HarHeader[];
  headersSize: number;
  bodySize: number;
  redirectURL: string;
  content: HarResponseContent;
  _transferSize: number;
}

export interface HarEntry {
  /** Cloudflare-specific: initial resource priority */
  _initialPriority: string;
  /** Cloudflare-specific: initiator type (script, parser, other, …) */
  _initiator_type: string;
  /** Cloudflare-specific: final resource priority */
  _priority: string;
  _requestId: string;
  _requestTime: number;
  /** Resource type: document, script, stylesheet, image, fetch, xhr, … */
  _resourceType: string;
  cache: unknown;
  connection: string;
  pageref: string;
  request: HarRequest;
  response: HarResponse;
  serverIPAddress: string;
  startedDateTime: string;
  /** Total time for this entry in ms */
  time: number;
}

export interface HarPageTimings {
  onContentLoad: number;
  onLoad: number;
}

export interface HarPage {
  id: string;
  pageTimings: HarPageTimings;
  startedDateTime: string;
  title: string;
}

export interface HarCreator {
  name: string;
  version: string;
  comment: string;
}

export interface HarLog {
  version: string;
  creator: HarCreator;
  pages: HarPage[];
  entries: HarEntry[];
}

export interface ScanHar {
  log: HarLog;
}

/**
 * Fetch the full HAR (network log) for a finished scan.
 *
 * API: GET /accounts/{id}/urlscanner/v2/har/{scan_id}
 * Returns `{ log: { creator, entries, pages, version } }` — standard HAR 1.2.
 *
 * HAR files can be large (hundreds of entries for complex pages). We return
 * the parsed object so callers can extract what they need (e.g. unique
 * third-party domains, resource types, response sizes) without storing the
 * whole thing unless explicitly requested.
 *
 * Returns null when the scanner isn't configured, the scan doesn't exist,
 * or the HAR isn't available yet.
 */
export async function getScanHar(scanId: string): Promise<ScanHar | null> {
  const config = getConfig();
  if (!config) return null;

  const res = await fetch(
    `${CF_BASE}/accounts/${config.accountId}/urlscanner/v2/har/${scanId}`,
    {
      headers: { Authorization: `Bearer ${config.token}` },
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn(`[getScanHar] HTTP ${res.status} for scan ${scanId}`);
    return null;
  }

  return (await res.json()) as ScanHar;
}

/**
 * Extract a compact summary from a HAR log — useful for enriching the
 * `scan_reports` row without storing the full multi-MB HAR.
 *
 * Returns:
 *   - `thirdPartyDomains`: unique hostnames contacted that differ from the
 *     primary page domain (trackers, CDNs, ad networks, etc.)
 *   - `resourceTypes`: count per _resourceType (script, image, fetch, …)
 *   - `totalRequests`: total entry count
 *   - `totalTransferBytes`: sum of _transferSize across all entries
 *   - `pageLoadMs`: onLoad timing from the first page
 */
export interface HarSummary {
  thirdPartyDomains: string[];
  resourceTypes: Record<string, number>;
  totalRequests: number;
  totalTransferBytes: number;
  pageLoadMs: number | null;
}

export function summarizeHar(har: ScanHar, primaryDomain?: string): HarSummary {
  const entries = har.log.entries ?? [];
  const thirdPartySet = new Set<string>();
  const resourceTypes: Record<string, number> = {};
  let totalTransferBytes = 0;

  for (const entry of entries) {
    const url = entry.request?.url ?? "";
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      /* skip malformed URLs */
    }

    if (host && primaryDomain && !host.endsWith(primaryDomain) && host !== primaryDomain) {
      thirdPartySet.add(host);
    }

    const rt = entry._resourceType ?? "other";
    resourceTypes[rt] = (resourceTypes[rt] ?? 0) + 1;

    totalTransferBytes += entry.response?._transferSize ?? 0;
  }

  const pageLoadMs = har.log.pages?.[0]?.pageTimings?.onLoad ?? null;

  return {
    thirdPartyDomains: Array.from(thirdPartySet).slice(0, 100),
    resourceTypes,
    totalRequests: entries.length,
    totalTransferBytes,
    pageLoadMs: typeof pageLoadMs === "number" ? pageLoadMs : null,
  };
}

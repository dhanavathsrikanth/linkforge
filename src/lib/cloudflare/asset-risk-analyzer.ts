import type { ScanResult } from "./url-scanner";

/**
 * Asset Risk Analyzer (Req 9).
 *
 * Inspects the rich Scan_Report fields beyond the Cloudflare overall verdict
 * and emits typed warnings the dashboard / Trust Score consume:
 *   - crypto_miner
 *   - fingerprinter
 *   - excessive_third_party_cookies
 *   - suspicious_global
 *   - console_error_burst
 *   - long_redirect_chain
 *   - expired_certificate
 *
 * Pure function — caller persists.
 */

export type AssetRiskKind =
  | "crypto_miner"
  | "fingerprinter"
  | "excessive_third_party_cookies"
  | "suspicious_global"
  | "console_error_burst"
  | "expired_certificate"
  | "long_redirect_chain"
  | "similar_to_malicious";

export interface AssetRiskFlag {
  kind: AssetRiskKind;
  payload: Record<string, unknown>;
}

// ─── Bundled blocklists ───────────────────────────────────────────────────────
// Conservative starter lists. Real production deployment should sync these
// from a curated source (e.g. EasyList Privacy, NoCoin, DisconnectMe) on a
// nightly cron — out of scope for this slice.

const CRYPTO_MINER_DOMAINS = new Set([
  "coinhive.com",
  "coin-hive.com",
  "authedmine.com",
  "jsecoin.com",
  "minero.cc",
  "cryptoloot.com",
  "webminerpool.com",
  "deepminer.com",
  "minemytraffic.com",
  "coinhave.com",
  "load.jsecoin.com",
]);

const FINGERPRINTER_DOMAINS = new Set([
  "fingerprint.com",
  "fingerprintjs.com",
  "iesnare.com",
  "online-metrix.net",
  "tags.tiqcdn.com",
  "everestjs.net",
  "audienceiq.com",
  "doubleverify.com",
  "trustarc.com",
  "perimeterx.net",
  "px-cdn.net",
]);

function registrableDomainOf(host: string): string {
  // Naïve registrable-domain guess: take the last two labels for typical
  // TLDs. We don't ship a full PSL here — close enough for blocklist lookup
  // because the lists themselves are at the registrable-domain level.
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

// ─── Analyze ──────────────────────────────────────────────────────────────────

export function analyzeAssetRisks(result: ScanResult): AssetRiskFlag[] {
  const flags: AssetRiskFlag[] = [];

  // ── Crypto miners + fingerprinters via contacted_domains ──────────────
  const minerHits = new Set<string>();
  const fpHits = new Set<string>();
  for (const raw of result.contactedDomains) {
    const dom = raw.replace(/^\./, "").toLowerCase();
    if (!dom) continue;
    const reg = registrableDomainOf(dom);
    if (CRYPTO_MINER_DOMAINS.has(dom) || CRYPTO_MINER_DOMAINS.has(reg)) {
      minerHits.add(dom);
    }
    if (FINGERPRINTER_DOMAINS.has(dom) || FINGERPRINTER_DOMAINS.has(reg)) {
      fpHits.add(dom);
    }
  }
  if (minerHits.size > 0) {
    flags.push({
      kind: "crypto_miner",
      payload: { domains: Array.from(minerHits) },
    });
  }
  if (fpHits.size > 0) {
    flags.push({
      kind: "fingerprinter",
      payload: { domains: Array.from(fpHits) },
    });
  }

  // ── Excessive third-party cookies ──────────────────────────────────────
  if (result.cookies.thirdParty > 30) {
    flags.push({
      kind: "excessive_third_party_cookies",
      payload: { count: result.cookies.thirdParty },
    });
  }

  // ── Suspicious globals ─────────────────────────────────────────────────
  if (result.globals.suspicious.length > 0) {
    flags.push({
      kind: "suspicious_global",
      payload: { names: result.globals.suspicious.slice(0, 25) },
    });
  }

  // ── Console error burst ────────────────────────────────────────────────
  if (result.console.errors > 20) {
    flags.push({
      kind: "console_error_burst",
      payload: { errors: result.console.errors },
    });
  }

  // ── Expired certificate ───────────────────────────────────────────────
  const now = Date.now();
  const expiredCerts = result.certificates.filter((c) => {
    if (!c.validTo) return false;
    const t = Date.parse(c.validTo);
    return Number.isFinite(t) && t < now;
  });
  if (expiredCerts.length > 0) {
    flags.push({
      kind: "expired_certificate",
      payload: {
        count: expiredCerts.length,
        examples: expiredCerts.slice(0, 3).map((c) => ({
          subject: c.subject,
          validTo: c.validTo,
        })),
      },
    });
  }

  // ── Long redirect chain ───────────────────────────────────────────────
  if (result.redirectChain.length > 5) {
    flags.push({
      kind: "long_redirect_chain",
      payload: { hops: result.redirectChain.length },
    });
  }

  return flags;
}

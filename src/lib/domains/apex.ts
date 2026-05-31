/**
 * Apex-vs-subdomain detection (custom-domain-assignment Req 10).
 *
 * An apex (a.k.a. root / naked) domain has no subdomain label — e.g.
 * `acme.co`, `acme.com`, `acme.co.uk`. A subdomain has at least one label in
 * front — e.g. `go.acme.co`, `links.acme.com`.
 *
 * Full correctness requires the Public Suffix List. To avoid pulling in a PSL
 * dependency for a UI hint, we special-case the common multi-part suffixes and
 * otherwise treat a two-label host as apex. This only drives which DNS
 * instructions we show; Cloudflare verification is the real gate.
 */

/** Common two-part public suffixes where the registrable domain has 3 labels. */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "me.uk", "ac.uk", "gov.uk",
  "co.jp", "or.jp", "ne.jp",
  "com.au", "net.au", "org.au",
  "co.nz", "com.br", "com.mx", "co.in", "co.za",
  "com.sg", "com.tr",
]);

export function isApexDomain(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  const labels = h.split(".");
  if (labels.length <= 2) return true; // acme.co / acme.com

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(lastTwo)) {
    // Registrable apex has exactly 3 labels (e.g. acme.co.uk).
    return labels.length === 3;
  }

  return false; // 3+ labels on a single-part TLD → subdomain
}

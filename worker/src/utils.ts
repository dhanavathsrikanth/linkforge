import type { RoutingRule, RequestContext } from "./types";

// ─── IP Hashing ──────────────────────────────────────────────────────────────

export async function hashIp(ip: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Device / Browser / OS Detection ─────────────────────────────────────────

export function parseDevice(
  ua: string
): "mobile" | "desktop" | "tablet" | "bot" | "unknown" {
  if (!ua) return "unknown";

  // Bot detection first
  if (
    /bot|spider|crawl|slurp|mediapartners|adsbot|googlebot|bingbot|yandex|baidu|duckduck|facebot|twitterbot|linkedinbot|whatsapp|telegram|facebookexternalhit|outbrain|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|claudebot|gptbot|chatgpt|openai/i.test(
      ua
    )
  ) {
    return "bot";
  }

  // Tablet before mobile (iPad matches mobile patterns too)
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    return "tablet";
  }

  // Mobile
  if (
    /mobile|iphone|ipod|android|blackberry|iemobile|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/i.test(
      ua
    )
  ) {
    return "mobile";
  }

  // Desktop fallback
  if (/windows|macintosh|linux|cros/i.test(ua)) {
    return "desktop";
  }

  return "unknown";
}

export function parseBrowser(ua: string): string {
  if (!ua) return "Other";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  if (/MSIE|Trident\//i.test(ua)) return "IE";
  return "Other";
}

export function parseOs(ua: string): string {
  if (!ua) return "Other";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  return "Other";
}

// ─── A/B Variant Picker ───────────────────────────────────────────────────────

export function pickAbVariant(
  variants: { destination: string; weight: number; name?: string }[]
): { destination: string; name: string } {
  if (!variants || variants.length === 0)
    return { destination: "", name: "" };

  const totalWeight = variants.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight ?? 1;
    if (random <= 0) {
      return {
        destination: variant.destination,
        name: variant.name ?? variant.destination,
      };
    }
  }

  // Fallback: last variant
  const last = variants[variants.length - 1];
  return { destination: last.destination, name: last.name ?? last.destination };
}

// ─── Smart Routing Rules ──────────────────────────────────────────────────────

export function resolveRoutingRules(
  rules: RoutingRule[],
  ctx: RequestContext
): string | null {
  for (const rule of rules) {
    const { condition, destination } = rule;
    let match = true;

    if (condition.device && condition.device !== ctx.device) {
      match = false;
    }
    if (condition.country && condition.country.toUpperCase() !== ctx.country.toUpperCase()) {
      match = false;
    }
    if (condition.language) {
      // Accept-Language: "en-US" should match rule language "en"
      const langMatch =
        ctx.language.toLowerCase().startsWith(condition.language.toLowerCase());
      if (!langMatch) match = false;
    }

    if (match) return destination;
  }

  return null; // No rule matched → use default destination
}

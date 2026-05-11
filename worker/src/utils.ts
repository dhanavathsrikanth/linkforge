export async function hashIp(ip: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function parseDevice(ua: string): "mobile" | "desktop" | "tablet" | "bot" | "unknown" {
  ua = ua.toLowerCase();
  if (ua.includes("bot") || ua.includes("spider") || ua.includes("crawl")) return "bot";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "mobile";
  if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) return "desktop";
  return "unknown";
}

export function parseBrowser(ua: string): string {
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("MSIE") || ua.includes("Trident/")) return "IE";
  return "Other";
}

export function parseOs(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS") || ua.match(/iPhone|iPad|iPod/)) return "iOS";
  return "Other";
}

export function getDomain(url: string): string {
  if (!url) return "";
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return "";
  }
}

export function pickAbVariant(variants: { destination: string; weight: number }[]): string {
  if (!variants || variants.length === 0) return "";
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  for (const variant of variants) {
    if (random < variant.weight) return variant.destination;
    random -= variant.weight;
  }
  return variants[variants.length - 1].destination;
}

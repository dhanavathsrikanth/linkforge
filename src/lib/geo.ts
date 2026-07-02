// ─── iplocate.io geo lookup (Next.js / Vercel side) ──────────────────────────
// Mirrors apps/worker/src/geo.ts but runs in the Next.js runtime.

export interface GeoResult {
  ip: string;
  city: string;
  region: string;
  country_code: string;
  country: string;
  latitude: number;
  longitude: number;
}

const IPLOCATE_API_KEY = process.env.IPLOCATE_API_KEY || '';

export async function lookupGeo(ip: string): Promise<GeoResult | null> {
  if (!IPLOCATE_API_KEY || !ip || ip === '0.0.0.0' || ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')) {
    return null;
  }
  try {
    const res = await fetch(`https://iplocate.io/api/lookup/${encodeURIComponent(ip)}?apikey=${IPLOCATE_API_KEY}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ip: data.ip || ip,
      city: data.city || '',
      region: data.subdivision || '',
      country_code: data.country_code || '',
      country: data.country || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
    };
  } catch {
    return null;
  }
}

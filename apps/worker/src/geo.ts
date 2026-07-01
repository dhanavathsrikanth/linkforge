// ─── iplocate.io geo lookup ───────────────────────────────────────────────────
// Returns accurate city/region/country from iplocate.io (free tier available).
// Falls back to null if the call fails.

export interface GeoResult {
  ip: string;
  city: string;
  region: string;   // "subdivision" in iplocate response
  country_code: string;
  country: string;
  latitude: number;
  longitude: number;
}

export async function lookupGeo(ip: string, apiKey: string): Promise<GeoResult | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://iplocate.io/api/lookup/${encodeURIComponent(ip)}?apikey=${apiKey}`, {
      cf: { cacheTtl: 86400 },
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

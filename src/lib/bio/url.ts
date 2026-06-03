export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  const raw = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? "https://pivoturl.com";
  return raw.replace(/\/$/, "");
}

export function getAppHostname(): string {
  try {
    return new URL(getAppBaseUrl()).hostname;
  } catch {
    return "pivoturl.com";
  }
}

export function getBioPageUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  return `${getAppBaseUrl()}/p/${slug}`;
}

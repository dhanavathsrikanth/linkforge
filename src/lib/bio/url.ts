/**
 * Resolves the canonical base URL for bio pages.
 * Always reads from NEXT_PUBLIC_APP_URL so the domain is dynamic across
 * environments. Falls back to pivoturl.com only if the env var is unset.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "https://pivoturl.com";
  // Strip trailing slash
  return raw.replace(/\/$/, "");
}

/**
 * Returns the public URL for a bio page slug.
 * Uses a custom domain if provided, otherwise falls back to /p/{slug}.
 */
export function getBioPageUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  return `${getAppBaseUrl()}/p/${slug}`;
}

/**
 * Returns the base URL hostname only (e.g. "pivoturl.com").
 */
export function getAppHostname(): string {
  try {
    return new URL(getAppBaseUrl()).hostname;
  } catch {
    return "pivoturl.com";
  }
}

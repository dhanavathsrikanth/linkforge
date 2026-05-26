const DEFAULT_API_URL = "https://linkforge.app";

export interface ShortLink {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  domain?: string;
  createdAt: string;
}

export interface CreateLinkParams {
  destination: string;
  slug?: string;
  title?: string;
  tags?: string[];
}

export interface CreateLinkResult {
  shortUrl: string;
  slug: string;
  data: ShortLink;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function createShortLink(
  apiKey: string,
  params: CreateLinkParams,
  apiUrl?: string,
): Promise<CreateLinkResult> {
  const base = apiUrl || DEFAULT_API_URL;
  const url = `${base}/api/v2/links`;

  const payload: Record<string, unknown> = {
    destination: params.destination,
  };
  if (params.slug?.trim()) payload.slug = params.slug.trim();
  if (params.title?.trim()) payload.title = params.title.trim();
  if (params.tags?.length) payload.tags = params.tags;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const err = body.error as Record<string, unknown> | undefined;
    throw new ApiError(
      (err?.message as string) || `Request failed with status ${res.status}`,
      res.status,
      err?.code as string | undefined,
    );
  }

  const data = await res.json();
  const link = data.data || data.link;
  const shortUrl = `https://${link.domain || "lf.ee"}/${link.slug}`;

  return { shortUrl, slug: link.slug, data: link };
}

export async function listLinks(
  apiKey: string,
  apiUrl?: string,
): Promise<ShortLink[]> {
  const base = apiUrl || DEFAULT_API_URL;
  const res = await fetch(`${base}/api/v2/links?limit=20`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new ApiError("Failed to fetch links", res.status);
  }

  const data = await res.json();
  return data.data || [];
}

import {
  AuthenticationError,
  ForbiddenError,
  LinkForgeError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: { error?: { code?: string; message?: string } } = {};
    try {
      body = await response.json();
    } catch {
      // ignore parse failure
    }

    const code = body.error?.code || "UNKNOWN";
    const message = body.error?.message || `HTTP ${response.status}`;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      case 429:
        throw new RateLimitError(message);
      case 422:
      case 400:
        throw new ValidationError(message, body);
      default:
        throw new LinkForgeError(message, code, response.status);
    }
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("image/png")) {
    return (await response.arrayBuffer()) as unknown as T;
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export function buildQueryString(params: object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v != null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

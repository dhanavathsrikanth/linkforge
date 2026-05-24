import type { LinkForgeConfig, LinkForgeError } from "./types";

export class LinkForgeClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeout: number;
  private readonly retry: { attempts: number; delay: number };

  constructor(config: LinkForgeConfig) {
    if (!config.apiKey) throw new Error("LinkForge SDK: apiKey is required");
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.linkforge.app";
    this.timeout = config.timeout ?? 30000;
    this.retry = config.retry ?? { attempts: 3, delay: 1000 };
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`/api/v1${path}`, this.baseUrl);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retry.attempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, this.retry.delay * attempt));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const res = await fetch(url.toString(), {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "X-SDK-Version": "1.0.0",
            "X-SDK-Lang": "typescript",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          const message =
            (errBody.error as { message?: string })?.message || `HTTP ${res.status}`;
          const err = new Error(message) as LinkForgeError;
          err.code = ((errBody.error as { code?: string })?.code) || "UNKNOWN_ERROR";
          err.status = res.status;
          if (res.status >= 400 && res.status < 500) throw err;
          lastError = err;
          continue;
        }

        const data = (await res.json()) as { data: T };
        return data.data;
      } catch (err) {
        clearTimeout(timeoutId);
        if ((err as Error).name === "AbortError") {
          lastError = new Error(`Request timeout after ${this.timeout}ms`);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }
}

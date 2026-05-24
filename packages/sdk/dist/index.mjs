// src/client.ts
var LinkForgeClient = class {
  constructor(config) {
    if (!config.apiKey) throw new Error("LinkForge SDK: apiKey is required");
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.linkforge.app";
    this.timeout = config.timeout ?? 3e4;
    this.retry = config.retry ?? { attempts: 3, delay: 1e3 };
  }
  async request(method, path, body, params) {
    const url = new URL(`/api/v1${path}`, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== void 0) url.searchParams.set(k, String(v));
      }
    }
    let lastError = null;
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
            "X-SDK-Lang": "typescript"
          },
          body: body ? JSON.stringify(body) : void 0,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const message = errBody.error?.message || `HTTP ${res.status}`;
          const err = new Error(message);
          err.code = errBody.error?.code || "UNKNOWN_ERROR";
          err.status = res.status;
          if (res.status >= 400 && res.status < 500) throw err;
          lastError = err;
          continue;
        }
        const data = await res.json();
        return data.data;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          lastError = new Error(`Request timeout after ${this.timeout}ms`);
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("Request failed after retries");
  }
};

// src/resources/links.ts
var LinksResource = class {
  constructor(client) {
    this.client = client;
  }
  async create(options) {
    return this.client.request("POST", "/links", options);
  }
  async list(options = {}) {
    return this.client.request("GET", "/links", void 0, options);
  }
  async get(id) {
    return this.client.request("GET", `/links/${id}`);
  }
  async update(id, options) {
    return this.client.request("PATCH", `/links/${id}`, options);
  }
  async delete(id) {
    return this.client.request("DELETE", `/links/${id}`);
  }
  async analytics(id, options = {}) {
    return this.client.request("GET", `/links/${id}/analytics`, void 0, options);
  }
  async bulkCreate(links) {
    return this.client.request("POST", "/links/bulk", { links });
  }
  async getQRCode(id, options = {}) {
    return this.client.request("GET", `/qr/${id}`, void 0, options);
  }
};

// src/resources/analytics.ts
var AnalyticsResource = class {
  constructor(client) {
    this.client = client;
  }
  async getWorkspaceAnalytics(options = {}) {
    return this.client.request("GET", "/analytics", void 0, options);
  }
  async trackConversion(event) {
    return this.client.request("POST", "/conversions", event);
  }
  async getAttribution(options) {
    return this.client.request("GET", "/analytics/attribution", void 0, options);
  }
  async exportCSV(options) {
    const url = new URL("/api/v1/analytics/export", this.client.baseUrl);
    for (const [k, v] of Object.entries(options)) {
      if (v) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.client.apiKey}` }
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  }
};

// src/index.ts
var LinkForge = class {
  constructor(config) {
    const resolvedConfig = typeof config === "string" ? { apiKey: config } : config;
    const client = new LinkForgeClient(resolvedConfig);
    this.links = new LinksResource(client);
    this.analytics = new AnalyticsResource(client);
  }
};
var index_default = LinkForge;
export {
  AnalyticsResource,
  LinkForge,
  LinkForgeClient,
  LinksResource,
  index_default as default
};

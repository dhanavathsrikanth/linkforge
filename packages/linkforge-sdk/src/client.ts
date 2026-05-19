import { LinksResource } from "./resources/links.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { QRResource } from "./resources/qr.js";
import { KeysResource } from "./resources/keys.js";
import { WorkspaceResource } from "./resources/workspace.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  body?: string;
}

export interface LinkForgeClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LinkForgeClient {
  public readonly links: LinksResource;
  public readonly analytics: AnalyticsResource;
  public readonly qr: QRResource;
  public readonly keys: KeysResource;
  public readonly workspace: WorkspaceResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LinkForgeClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://api.linkforge.app").replace(/\/+$/, "");

    this.links = new LinksResource(this.request.bind(this));
    this.analytics = new AnalyticsResource(this.request.bind(this));
    this.qr = new QRResource(this.request.bind(this));
    this.keys = new KeysResource(this.request.bind(this));
    this.workspace = new WorkspaceResource(this.request.bind(this));
  }

  private async request(
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (options?.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body,
    });

    return response;
  }

  getKeyType(): "secret" | "publishable" {
    if (this.apiKey.startsWith("lf_pk_")) return "publishable";
    return "secret";
  }
}

import type { LinkForgeClient } from "../client";
import type {
  Link,
  CreateLinkOptions,
  UpdateLinkOptions,
  ListLinksOptions,
  LinkList,
  LinkAnalytics,
  AnalyticsOptions,
} from "../types";

export class LinksResource {
  constructor(private readonly client: LinkForgeClient) {}

  async create(options: CreateLinkOptions): Promise<Link> {
    return this.client.request<Link>("POST", "/links", options);
  }

  async list(options: ListLinksOptions = {}): Promise<LinkList> {
    return this.client.request<LinkList>("GET", "/links", undefined, options as Record<string, string | number | boolean | undefined>);
  }

  async get(id: string): Promise<Link> {
    return this.client.request<Link>("GET", `/links/${id}`);
  }

  async update(id: string, options: UpdateLinkOptions): Promise<Link> {
    return this.client.request<Link>("PATCH", `/links/${id}`, options);
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>("DELETE", `/links/${id}`);
  }

  async analytics(id: string, options: AnalyticsOptions = {}): Promise<LinkAnalytics> {
    return this.client.request<LinkAnalytics>("GET", `/links/${id}/analytics`, undefined, options as Record<string, string | number | boolean | undefined>);
  }

  async bulkCreate(links: CreateLinkOptions[]): Promise<Link[]> {
    return this.client.request<Link[]>("POST", "/links/bulk", { links });
  }

  async getQRCode(id: string, options: { size?: number; format?: "png" | "svg" } = {}): Promise<string> {
    return this.client.request<string>("GET", `/qr/${id}`, undefined, options as Record<string, string | number | boolean | undefined>);
  }
}

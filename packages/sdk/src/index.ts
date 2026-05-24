import { LinkForgeClient } from "./client";
import { LinksResource } from "./resources/links";
import { AnalyticsResource } from "./resources/analytics";
import type { LinkForgeConfig } from "./types";

export class LinkForge {
  readonly links: LinksResource;
  readonly analytics: AnalyticsResource;

  constructor(config: LinkForgeConfig | string) {
    const resolvedConfig = typeof config === "string" ? { apiKey: config } : config;
    const client = new LinkForgeClient(resolvedConfig);
    this.links = new LinksResource(client);
    this.analytics = new AnalyticsResource(client);
  }
}

export * from "./types";
export { LinkForgeClient } from "./client";
export { LinksResource } from "./resources/links";
export { AnalyticsResource } from "./resources/analytics";
export default LinkForge;

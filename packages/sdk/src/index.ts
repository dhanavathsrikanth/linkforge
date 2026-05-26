import { PivotUrlClient } from "./client";
import { LinksResource } from "./resources/links";
import { AnalyticsResource } from "./resources/analytics";
import type { PivotUrlConfig } from "./types";

export class PivotUrl {
  readonly links: LinksResource;
  readonly analytics: AnalyticsResource;

  constructor(config: PivotUrlConfig | string) {
    const resolvedConfig = typeof config === "string" ? { apiKey: config } : config;
    const client = new PivotUrlClient(resolvedConfig);
    this.links = new LinksResource(client);
    this.analytics = new AnalyticsResource(client);
  }
}

export * from "./types";
export { PivotUrlClient } from "./client";
export { LinksResource } from "./resources/links";
export { AnalyticsResource } from "./resources/analytics";
export default PivotUrl;

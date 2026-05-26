import type { PivotUrlClient } from "../client";
import type { AttributionReport, ConversionEvent } from "../types";

export class AnalyticsResource {
  constructor(private readonly client: PivotUrlClient) {}

  async getWorkspaceAnalytics(options: {
    range?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  } = {}) {
    return this.client.request("GET", "/analytics", undefined, options as Record<string, string | number | boolean | undefined>);
  }

  async trackConversion(event: ConversionEvent): Promise<void> {
    return this.client.request<void>("POST", "/conversions", event);
  }

  async getAttribution(options: {
    model: "first_touch" | "last_touch" | "linear" | "time_decay";
    range?: string;
  }): Promise<AttributionReport> {
    return this.client.request<AttributionReport>("GET", "/analytics/attribution", undefined, options as Record<string, string | number | boolean | undefined>);
  }

  async exportCSV(options: { range?: string; linkId?: string }): Promise<Blob> {
    const url = new URL("/api/v1/analytics/export", this.client.baseUrl);
    for (const [k, v] of Object.entries(options)) {
      if (v) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.client.apiKey}` },
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  }
}

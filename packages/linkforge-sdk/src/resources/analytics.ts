import type { HttpMethod, RequestOptions } from "../client.js";
import type {
  AnalyticsOverview,
  AnalyticsBreakdownItem,
  AnalyticsTimeseriesItem,
  AnalyticsTopLink,
} from "../types.js";
import { buildQueryString, handleResponse } from "../utils.js";

export class AnalyticsResource {
  constructor(
    private readonly fetchFn: (
      method: HttpMethod,
      path: string,
      options?: RequestOptions,
    ) => Promise<Response>,
  ) {}

  overview(params?: {
    range?: "7d" | "30d" | "90d" | "custom";
    from?: string;
    to?: string;
    linkId?: string;
  }): Promise<AnalyticsOverview> {
    return this.fetchFn("GET", `/v2/analytics/overview${buildQueryString(params ?? {})}`).then(
      (r) => handleResponse<AnalyticsOverview>(r),
    );
  }

  breakdown(params?: {
    range?: "7d" | "30d" | "90d" | "custom";
    from?: string;
    to?: string;
    linkId?: string;
    dimension?: "country" | "device" | "browser" | "os" | "referrer";
  }): Promise<AnalyticsBreakdownItem[]> {
    return this.fetchFn("GET", `/v2/analytics/breakdown${buildQueryString(params ?? {})}`).then(
      (r) => handleResponse<AnalyticsBreakdownItem[]>(r),
    );
  }

  timeseries(params?: {
    range?: "7d" | "30d" | "90d" | "custom";
    from?: string;
    to?: string;
    linkId?: string;
    groupBy?: "hour" | "day";
  }): Promise<AnalyticsTimeseriesItem[]> {
    return this.fetchFn("GET", `/v2/analytics/timeseries${buildQueryString(params ?? {})}`).then(
      (r) => handleResponse<AnalyticsTimeseriesItem[]>(r),
    );
  }

  topLinks(params?: {
    range?: "7d" | "30d" | "90d" | "custom";
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AnalyticsTopLink[]> {
    return this.fetchFn("GET", `/v2/analytics/top-links${buildQueryString(params ?? {})}`).then(
      (r) => handleResponse<AnalyticsTopLink[]>(r),
    );
  }
}

import type { HttpMethod, RequestOptions } from "../client.js";
import type { AnalyticsOverview, AnalyticsBreakdownItem, AnalyticsTimeseriesItem, AnalyticsTopLink } from "../types.js";
export declare class AnalyticsResource {
    private readonly fetchFn;
    constructor(fetchFn: (method: HttpMethod, path: string, options?: RequestOptions) => Promise<Response>);
    overview(params?: {
        range?: "7d" | "30d" | "90d" | "custom";
        from?: string;
        to?: string;
        linkId?: string;
    }): Promise<AnalyticsOverview>;
    breakdown(params?: {
        range?: "7d" | "30d" | "90d" | "custom";
        from?: string;
        to?: string;
        linkId?: string;
        dimension?: "country" | "device" | "browser" | "os" | "referrer";
    }): Promise<AnalyticsBreakdownItem[]>;
    timeseries(params?: {
        range?: "7d" | "30d" | "90d" | "custom";
        from?: string;
        to?: string;
        linkId?: string;
        groupBy?: "hour" | "day";
    }): Promise<AnalyticsTimeseriesItem[]>;
    topLinks(params?: {
        range?: "7d" | "30d" | "90d" | "custom";
        from?: string;
        to?: string;
        limit?: number;
    }): Promise<AnalyticsTopLink[]>;
}
//# sourceMappingURL=analytics.d.ts.map
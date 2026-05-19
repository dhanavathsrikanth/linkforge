import { buildQueryString, handleResponse } from "../utils.js";
export class AnalyticsResource {
    constructor(fetchFn) {
        this.fetchFn = fetchFn;
    }
    overview(params) {
        return this.fetchFn("GET", `/v2/analytics/overview${buildQueryString(params !== null && params !== void 0 ? params : {})}`).then((r) => handleResponse(r));
    }
    breakdown(params) {
        return this.fetchFn("GET", `/v2/analytics/breakdown${buildQueryString(params !== null && params !== void 0 ? params : {})}`).then((r) => handleResponse(r));
    }
    timeseries(params) {
        return this.fetchFn("GET", `/v2/analytics/timeseries${buildQueryString(params !== null && params !== void 0 ? params : {})}`).then((r) => handleResponse(r));
    }
    topLinks(params) {
        return this.fetchFn("GET", `/v2/analytics/top-links${buildQueryString(params !== null && params !== void 0 ? params : {})}`).then((r) => handleResponse(r));
    }
}
//# sourceMappingURL=analytics.js.map
import { LinksResource } from "./resources/links.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { QRResource } from "./resources/qr.js";
import { KeysResource } from "./resources/keys.js";
import { WorkspaceResource } from "./resources/workspace.js";
export class LinkForgeClient {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl || "https://api.linkforge.app").replace(/\/+$/, "");
        this.links = new LinksResource(this.request.bind(this));
        this.analytics = new AnalyticsResource(this.request.bind(this));
        this.qr = new QRResource(this.request.bind(this));
        this.keys = new KeysResource(this.request.bind(this));
        this.workspace = new WorkspaceResource(this.request.bind(this));
    }
    async request(method, path, options) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
        };
        if (options === null || options === void 0 ? void 0 : options.body) {
            headers["Content-Type"] = "application/json";
        }
        const response = await fetch(url, {
            method,
            headers,
            body: options === null || options === void 0 ? void 0 : options.body,
        });
        return response;
    }
    getKeyType() {
        if (this.apiKey.startsWith("lf_pk_"))
            return "publishable";
        return "secret";
    }
}
//# sourceMappingURL=client.js.map
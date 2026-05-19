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
export declare class LinkForgeClient {
    readonly links: LinksResource;
    readonly analytics: AnalyticsResource;
    readonly qr: QRResource;
    readonly keys: KeysResource;
    readonly workspace: WorkspaceResource;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(config: LinkForgeClientConfig);
    private request;
    getKeyType(): "secret" | "publishable";
}
//# sourceMappingURL=client.d.ts.map
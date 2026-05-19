import type { HttpMethod, RequestOptions } from "../client.js";
import type { ApiKey, CreatedApiKey } from "../types.js";
export declare class KeysResource {
    private readonly fetchFn;
    constructor(fetchFn: (method: HttpMethod, path: string, options?: RequestOptions) => Promise<Response>);
    list(): Promise<ApiKey[]>;
    create(name: string, keyType?: "secret" | "publishable"): Promise<CreatedApiKey>;
    revoke(id: string): Promise<{
        revoked: boolean;
    }>;
}
//# sourceMappingURL=keys.d.ts.map
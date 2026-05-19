import type { HttpMethod, RequestOptions } from "../client.js";
import type { LinkData, LinkListResponse, CreateLinkInput, UpdateLinkInput } from "../types.js";
export declare class LinksResource {
    private readonly fetchFn;
    constructor(fetchFn: (method: HttpMethod, path: string, options?: RequestOptions) => Promise<Response>);
    list(params?: {
        offset?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }): Promise<LinkListResponse>;
    get(id: string): Promise<LinkData>;
    create(input: CreateLinkInput): Promise<LinkData>;
    update(id: string, input: UpdateLinkInput): Promise<LinkData>;
    delete(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
//# sourceMappingURL=links.d.ts.map
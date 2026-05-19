import type { HttpMethod, RequestOptions } from "../client.js";
import type { WorkspaceData } from "../types.js";
export declare class WorkspaceResource {
    private readonly fetchFn;
    constructor(fetchFn: (method: HttpMethod, path: string, options?: RequestOptions) => Promise<Response>);
    get(): Promise<WorkspaceData>;
    patch(input: {
        name?: string;
        logo?: string;
    }): Promise<WorkspaceData>;
}
//# sourceMappingURL=workspace.d.ts.map
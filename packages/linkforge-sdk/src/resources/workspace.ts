import type { HttpMethod, RequestOptions } from "../client.js";
import type { WorkspaceData } from "../types.js";
import { handleResponse } from "../utils.js";

export class WorkspaceResource {
  constructor(
    private readonly fetchFn: (
      method: HttpMethod,
      path: string,
      options?: RequestOptions,
    ) => Promise<Response>,
  ) {}

  get(): Promise<WorkspaceData> {
    return this.fetchFn("GET", "/v2/workspace").then((r) => handleResponse<WorkspaceData>(r));
  }

  patch(input: { name?: string; logo?: string }): Promise<WorkspaceData> {
    return this.fetchFn("PATCH", "/v2/workspace", { body: JSON.stringify(input) }).then(
      (r) => handleResponse<WorkspaceData>(r),
    );
  }
}

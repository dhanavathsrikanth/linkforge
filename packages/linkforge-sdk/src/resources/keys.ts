import type { HttpMethod, RequestOptions } from "../client.js";
import type { ApiKey, CreatedApiKey } from "../types.js";
import { handleResponse } from "../utils.js";

export class KeysResource {
  constructor(
    private readonly fetchFn: (
      method: HttpMethod,
      path: string,
      options?: RequestOptions,
    ) => Promise<Response>,
  ) {}

  list(): Promise<ApiKey[]> {
    return this.fetchFn("GET", "/v2/keys").then((r) => handleResponse<ApiKey[]>(r));
  }

  create(name: string, keyType?: "secret" | "publishable"): Promise<CreatedApiKey> {
    return this.fetchFn("POST", "/v2/keys", {
      body: JSON.stringify({ name, keyType }),
    }).then((r) => handleResponse<CreatedApiKey>(r));
  }

  revoke(id: string): Promise<{ revoked: boolean }> {
    return this.fetchFn("DELETE", `/v2/keys/${id}`).then(
      (r) => handleResponse<{ revoked: boolean }>(r),
    );
  }
}

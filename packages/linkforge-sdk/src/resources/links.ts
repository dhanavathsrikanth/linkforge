import type { HttpMethod, RequestOptions } from "../client.js";
import type {
  LinkData,
  LinkListResponse,
  CreateLinkInput,
  UpdateLinkInput,
} from "../types.js";
import { buildQueryString, handleResponse } from "../utils.js";

export class LinksResource {
  constructor(
    private readonly fetchFn: (
      method: HttpMethod,
      path: string,
      options?: RequestOptions,
    ) => Promise<Response>,
  ) {}

  list(params?: {
    offset?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<LinkListResponse> {
    return this.fetchFn("GET", `/v2/links${buildQueryString(params ?? {})}`).then(
      (r) => handleResponse<LinkListResponse>(r),
    );
  }

  get(id: string): Promise<LinkData> {
    return this.fetchFn("GET", `/v2/links/${id}`).then(
      (r) => handleResponse<LinkData>(r),
    );
  }

  create(input: CreateLinkInput): Promise<LinkData> {
    return this.fetchFn("POST", "/v2/links", { body: JSON.stringify(input) }).then(
      (r) => handleResponse<LinkData>(r),
    );
  }

  update(id: string, input: UpdateLinkInput): Promise<LinkData> {
    return this.fetchFn("PATCH", `/v2/links/${id}`, { body: JSON.stringify(input) }).then(
      (r) => handleResponse<LinkData>(r),
    );
  }

  delete(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.fetchFn("DELETE", `/v2/links/${id}`).then(
      (r) => handleResponse<{ id: string; deleted: boolean }>(r),
    );
  }
}

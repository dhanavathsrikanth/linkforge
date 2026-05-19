import { buildQueryString, handleResponse } from "../utils.js";
export class LinksResource {
    constructor(fetchFn) {
        this.fetchFn = fetchFn;
    }
    list(params) {
        return this.fetchFn("GET", `/v2/links${buildQueryString(params !== null && params !== void 0 ? params : {})}`).then((r) => handleResponse(r));
    }
    get(id) {
        return this.fetchFn("GET", `/v2/links/${id}`).then((r) => handleResponse(r));
    }
    create(input) {
        return this.fetchFn("POST", "/v2/links", { body: JSON.stringify(input) }).then((r) => handleResponse(r));
    }
    update(id, input) {
        return this.fetchFn("PATCH", `/v2/links/${id}`, { body: JSON.stringify(input) }).then((r) => handleResponse(r));
    }
    delete(id) {
        return this.fetchFn("DELETE", `/v2/links/${id}`).then((r) => handleResponse(r));
    }
}
//# sourceMappingURL=links.js.map
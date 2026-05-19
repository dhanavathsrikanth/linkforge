import { handleResponse } from "../utils.js";
export class KeysResource {
    constructor(fetchFn) {
        this.fetchFn = fetchFn;
    }
    list() {
        return this.fetchFn("GET", "/v2/keys").then((r) => handleResponse(r));
    }
    create(name, keyType) {
        return this.fetchFn("POST", "/v2/keys", {
            body: JSON.stringify({ name, keyType }),
        }).then((r) => handleResponse(r));
    }
    revoke(id) {
        return this.fetchFn("DELETE", `/v2/keys/${id}`).then((r) => handleResponse(r));
    }
}
//# sourceMappingURL=keys.js.map
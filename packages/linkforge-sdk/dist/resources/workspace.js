import { handleResponse } from "../utils.js";
export class WorkspaceResource {
    constructor(fetchFn) {
        this.fetchFn = fetchFn;
    }
    get() {
        return this.fetchFn("GET", "/v2/workspace").then((r) => handleResponse(r));
    }
    patch(input) {
        return this.fetchFn("PATCH", "/v2/workspace", { body: JSON.stringify(input) }).then((r) => handleResponse(r));
    }
}
//# sourceMappingURL=workspace.js.map
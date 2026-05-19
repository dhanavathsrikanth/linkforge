import { AuthenticationError, ForbiddenError, LinkForgeError, NotFoundError, RateLimitError, ValidationError, } from "./errors.js";
export async function handleResponse(response) {
    var _a, _b;
    if (!response.ok) {
        let body = {};
        try {
            body = await response.json();
        }
        catch {
            // ignore parse failure
        }
        const code = ((_a = body.error) === null || _a === void 0 ? void 0 : _a.code) || "UNKNOWN";
        const message = ((_b = body.error) === null || _b === void 0 ? void 0 : _b.message) || `HTTP ${response.status}`;
        switch (response.status) {
            case 401:
                throw new AuthenticationError(message);
            case 403:
                throw new ForbiddenError(message);
            case 404:
                throw new NotFoundError(message);
            case 429:
                throw new RateLimitError(message);
            case 422:
            case 400:
                throw new ValidationError(message, body);
            default:
                throw new LinkForgeError(message, code, response.status);
        }
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("image/png")) {
        return (await response.arrayBuffer());
    }
    const json = await response.json();
    return json.data !== undefined ? json.data : json;
}
export function buildQueryString(params) {
    const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
    if (entries.length === 0)
        return "";
    return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}
//# sourceMappingURL=utils.js.map
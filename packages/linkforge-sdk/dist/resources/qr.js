import { buildQueryString, handleResponse } from "../utils.js";
export class QRResource {
    constructor(fetchFn) {
        this.fetchFn = fetchFn;
    }
    generate(params) {
        return this.fetchFn("GET", `/v2/qr${buildQueryString(params)}`).then((r) => handleResponse(r));
    }
    async generateDataURL(params) {
        const buffer = await this.generate(params);
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return `data:image/png;base64,${btoa(binary)}`;
    }
}
//# sourceMappingURL=qr.js.map
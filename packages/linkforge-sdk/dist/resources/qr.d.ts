import type { HttpMethod, RequestOptions } from "../client.js";
export interface QRCodeParams {
    url: string;
    size?: number;
    fgColor?: string;
    bgColor?: string;
    errorLevel?: "L" | "M" | "Q" | "H";
}
export declare class QRResource {
    private readonly fetchFn;
    constructor(fetchFn: (method: HttpMethod, path: string, options?: RequestOptions) => Promise<Response>);
    generate(params: QRCodeParams): Promise<ArrayBuffer>;
    generateDataURL(params: QRCodeParams): Promise<string>;
}
//# sourceMappingURL=qr.d.ts.map
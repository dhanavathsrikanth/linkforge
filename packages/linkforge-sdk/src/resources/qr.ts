import type { HttpMethod, RequestOptions } from "../client.js";
import { buildQueryString, handleResponse } from "../utils.js";

export interface QRCodeParams {
  url: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  errorLevel?: "L" | "M" | "Q" | "H";
}

export class QRResource {
  constructor(
    private readonly fetchFn: (
      method: HttpMethod,
      path: string,
      options?: RequestOptions,
    ) => Promise<Response>,
  ) {}

  generate(params: QRCodeParams): Promise<ArrayBuffer> {
    return this.fetchFn("GET", `/v2/qr${buildQueryString(params)}`).then(
      (r) => handleResponse<ArrayBuffer>(r),
    );
  }

  async generateDataURL(params: QRCodeParams): Promise<string> {
    const buffer = await this.generate(params);
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/png;base64,${btoa(binary)}`;
  }
}

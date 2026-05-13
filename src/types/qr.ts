// QR code settings type — stored as JSONB in the links.qrSettings column.
export interface QRSettings {
  fgColor: string; // hex, default "#000000"
  bgColor: string; // hex or "transparent", default "#ffffff"
  errorLevel: "L" | "M" | "Q" | "H";
  size: number; // 128–1024
  /**
   * base64-encoded data URL for the center logo.
   * Max 50 KB before encoding. Stored inline in JSONB.
   */
  logoUrl?: string;
  rounded: boolean;
  /**
   * Phase 1: only "none" and "scan-me" (label below QR).
   * "custom" is Phase 2.
   */
  frameStyle: "none" | "scan-me";
  frameText?: string; // used when frameStyle === "scan-me" to override label
}

export const DEFAULT_QR_SETTINGS: QRSettings = {
  fgColor: "#000000",
  bgColor: "#ffffff",
  errorLevel: "M",
  size: 256,
  rounded: false,
  frameStyle: "none",
};

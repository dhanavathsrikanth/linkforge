export interface QRSettings {
  fgColor: string;
  bgColor: string;
  errorLevel: "L" | "M" | "Q" | "H";
  size: number;
  logoUrl?: string;
  logoOpacity?: number;
  logoSize?: "small" | "medium" | "large";
  rounded: boolean;
  frameStyle: "none" | "scan-me";
  frameText?: string;
  marginSize?: number;
  boostLevel?: boolean;
  minVersion?: number;
}

export const DEFAULT_QR_SETTINGS: QRSettings = {
  fgColor: "#000000",
  bgColor: "#ffffff",
  errorLevel: "M",
  size: 256,
  rounded: false,
  frameStyle: "none",
  logoOpacity: 1,
  logoSize: "medium",
  marginSize: 0,
  boostLevel: true,
  minVersion: 1,
};

"use client";

import type { QRSettings } from "@/types/qr";
import { trackQRDownloaded } from "@/lib/posthog";

/** Triggers a browser file download from a Blob. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download PNG by calling /api/qr at 1024px.
 * Avoids cross-browser canvas/SVG serialisation issues.
 */
export async function downloadPNG(
  targetUrl: string,
  slug: string,
  settings: QRSettings,
  linkId?: string
): Promise<void> {
  const params = new URLSearchParams({
    url: targetUrl,
    size: "1024",
    fgColor: settings.fgColor,
    bgColor: settings.bgColor === "transparent" ? "transparent" : settings.bgColor,
    errorLevel: settings.errorLevel,
  });

  const res = await fetch(`/api/qr?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to download QR PNG");

  const blob = await res.blob();
  triggerDownload(blob, `${slug}-qr.png`);

  // Track QR download in PostHog
  if (linkId) {
    trackQRDownloaded({ linkId, format: "png" });
  }
}

/**
 * Download SVG by serialising the <svg> element rendered by qrcode.react.
 * Caller must pass the SVG element ref.
 */
export function downloadSVG(svgElement: SVGSVGElement, slug: string, linkId?: string): void {
  const serialiser = new XMLSerializer();
  const raw = serialiser.serializeToString(svgElement);
  // Ensure proper XML namespace
  const withNS = raw.startsWith("<svg")
    ? raw.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    : raw;
  const blob = new Blob([withNS], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, `${slug}-qr.svg`);

  // Track QR download in PostHog
  if (linkId) {
    trackQRDownloaded({ linkId, format: "svg" });
  }
}

/**
 * Copy PNG to clipboard using the Clipboard API.
 * Falls back to a no-op with an error log if not supported.
 */
export async function copyPNGToClipboard(
  targetUrl: string,
  settings: QRSettings
): Promise<void> {
  const params = new URLSearchParams({
    url: targetUrl,
    size: "512",
    fgColor: settings.fgColor,
    bgColor: settings.bgColor === "transparent" ? "#ffffff" : settings.bgColor,
    errorLevel: settings.errorLevel,
  });

  const res = await fetch(`/api/qr?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch QR PNG for clipboard");

  const blob = await res.blob();
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    throw new Error("Clipboard API not supported in this browser");
  }
}

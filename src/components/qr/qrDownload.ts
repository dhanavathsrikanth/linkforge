"use client";

import QRCode from "qrcode";
import type { QRSettings } from "@/types/qr";
import { trackQRDownloaded } from "@/lib/posthog";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderToCanvas(
  text: string,
  settings: QRSettings,
  outputSize: number,
): Promise<HTMLCanvasElement> {
  // 1. Render QR pattern on a temporary canvas using the qrcode library
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, text, {
    width: outputSize,
    margin: settings.marginSize ?? 0,
    color: {
      dark: settings.fgColor,
      light: settings.bgColor === "transparent" ? "#ffffff" : settings.bgColor,
    },
    errorCorrectionLevel: settings.errorLevel,
  });

  // 2. Determine output dimensions
  const hasFrame = settings.frameStyle === "scan-me";
  const frameH = hasFrame ? Math.round(outputSize * 0.08) : 0;
  const totalH = outputSize + frameH;

  // 3. Create final canvas
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // 4. Fill background (pure white for frame area too)
  ctx.fillStyle = settings.bgColor === "transparent" ? "#ffffff" : settings.bgColor;
  ctx.fillRect(0, 0, outputSize, totalH);

  // 5. Draw the QR pattern
  ctx.drawImage(qrCanvas, 0, 0);

  // 6. Overlay logo in centre
  if (settings.logoUrl) {
    try {
      const img = await loadImage(settings.logoUrl);
      const logoRatio =
        settings.logoSize === "small" ? 0.15 :
        settings.logoSize === "large" ? 0.30 : 0.20;
      const logoW = Math.round(outputSize * logoRatio);
      const logoH = Math.round(outputSize * logoRatio);
      const logoX = Math.round((outputSize - logoW) / 2);
      const logoY = Math.round((outputSize - logoH) / 2);

      // Excavate — fill a white square behind the logo
      ctx.fillStyle = settings.bgColor === "transparent" ? "#ffffff" : settings.bgColor;
      ctx.fillRect(logoX, logoY, logoW, logoH);
      ctx.globalAlpha = settings.logoOpacity ?? 1;
      ctx.drawImage(img, logoX, logoY, logoW, logoH);
      ctx.globalAlpha = 1;
    } catch (e) {
      console.warn("Logo overlay skipped", e);
    }
  }

  // 7. Frame text below the QR code
  if (hasFrame && (settings.frameText ?? "SCAN ME")) {
    ctx.fillStyle = settings.fgColor;
    ctx.font = `bold ${Math.round(outputSize * 0.032)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(settings.frameText || "SCAN ME", outputSize / 2, outputSize + frameH / 2);
  }

  return canvas;
}

export async function downloadPNG(
  targetUrl: string,
  slug: string,
  settings: QRSettings,
  linkId?: string,
): Promise<void> {
  const canvas = await renderToCanvas(targetUrl, settings, 1024);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
  triggerDownload(blob, `${slug}-qr.png`);
  if (linkId) trackQRDownloaded({ linkId, format: "png" });
}

export function downloadSVG(
  svgElement: SVGSVGElement,
  slug: string,
  settings: QRSettings,
  linkId?: string,
): void {
  const raw = new XMLSerializer().serializeToString(svgElement);
  const withNS = raw.startsWith("<svg")
    ? raw.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    : raw;
  const blob = new Blob([withNS], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, `${slug}-qr.svg`);
  if (linkId) trackQRDownloaded({ linkId, format: "svg" });
}

export async function copyPNGToClipboard(
  targetUrl: string,
  settings: QRSettings,
): Promise<void> {
  const canvas = await renderToCanvas(targetUrl, settings, 512);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    throw new Error("Clipboard API not supported in this browser");
  }
}

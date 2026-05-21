"use client";

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

function buildFullSvg(
  svgEl: SVGSVGElement,
  settings: QRSettings,
  outputSize: number,
): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const viewBox = clone.getAttribute("viewBox") || "0 0 256 256";
  const parts = viewBox.split(" ");
  const qrW = parseFloat(parts[2] || "256");
  const qrH = parseFloat(parts[3] || "256");

  const hasFrame = settings.frameStyle === "scan-me";
  const extraH = hasFrame ? Math.round(outputSize * 0.07) : 0;
  const totalH = outputSize + extraH;

  clone.setAttribute("width", String(outputSize));
  clone.setAttribute("height", String(totalH));
  clone.setAttribute("viewBox", `0 0 ${qrW} ${qrH + (hasFrame ? Math.round(qrH * 0.07) : 0)}`);

  const ns = "http://www.w3.org/2000/svg";

  if (hasFrame) {
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(qrW / 2));
    text.setAttribute("y", String(qrH + Math.round(qrH * 0.045)));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", String(Math.round(qrW * 0.055)));
    text.setAttribute("font-weight", "bold");
    text.setAttribute("font-family", "sans-serif");
    text.setAttribute("fill", settings.fgColor);
    text.textContent = settings.frameText || "SCAN ME";
    clone.appendChild(text);
  }

  if (settings.rounded) {
    const defs = document.createElementNS(ns, "defs");
    const clipPath = document.createElementNS(ns, "clipPath");
    clipPath.setAttribute("id", "qr-rounded-clip");
    const rect = document.createElementNS(ns, "rect");
    const r = Math.round(qrW * 0.06);
    rect.setAttribute("width", String(qrW));
    rect.setAttribute("height", String(qrH + (hasFrame ? Math.round(qrH * 0.07) : 0)));
    rect.setAttribute("rx", String(r));
    rect.setAttribute("ry", String(r));
    clipPath.appendChild(rect);
    defs.appendChild(clipPath);
    clone.insertBefore(defs, clone.firstChild);
    const g = document.createElementNS(ns, "g");
    g.setAttribute("clip-path", "url(#qr-rounded-clip)");
    while (clone.childNodes.length > 0) {
      const child = clone.childNodes[0]!;
      if (child !== defs) {
        clone.removeChild(child);
        g.appendChild(child);
      } else {
        break;
      }
    }
    clone.appendChild(g);
  }

  return clone;
}

async function svgToPngBlob(svg: SVGSVGElement, width: number, height: number): Promise<Blob> {
  const raw = new XMLSerializer().serializeToString(svg);
  const withNS = raw.startsWith("<svg")
    ? raw.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    : raw;
  const svgBlob = new Blob([withNS], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Fill background (PNG doesn't support transparency well for clipboard)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const img = await loadImage(url);
  URL.revokeObjectURL(url);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}

export async function downloadPNG(
  targetUrl: string,
  slug: string,
  settings: QRSettings,
  linkId?: string,
  svgRef?: SVGSVGElement | null,
): Promise<void> {
  if (!svgRef) {
    throw new Error("QR SVG not rendered");
  }

  const outputSize = 1024;
  const fullSvg = buildFullSvg(svgRef, settings, outputSize);
  const hasFrame = settings.frameStyle === "scan-me";
  const extraH = hasFrame ? Math.round(outputSize * 0.07) : 0;
  const blob = await svgToPngBlob(fullSvg, outputSize, outputSize + extraH);
  triggerDownload(blob, `${slug}-qr.png`);

  if (linkId) {
    trackQRDownloaded({ linkId, format: "png" });
  }
}

export function downloadSVG(
  svgElement: SVGSVGElement,
  slug: string,
  settings: QRSettings,
  linkId?: string,
): void {
  const outputSize = 1024;
  const fullSvg = buildFullSvg(svgElement, settings, outputSize);
  const raw = new XMLSerializer().serializeToString(fullSvg);
  const withNS = raw.startsWith("<svg")
    ? raw.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    : raw;
  const blob = new Blob([withNS], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, `${slug}-qr.svg`);

  if (linkId) {
    trackQRDownloaded({ linkId, format: "svg" });
  }
}

export async function copyPNGToClipboard(
  targetUrl: string,
  settings: QRSettings,
  svgRef?: SVGSVGElement | null,
): Promise<void> {
  if (!svgRef) {
    throw new Error("QR SVG not rendered");
  }

  const outputSize = 512;
  const fullSvg = buildFullSvg(svgRef, settings, outputSize);
  const hasFrame = settings.frameStyle === "scan-me";
  const extraH = hasFrame ? Math.round(outputSize * 0.07) : 0;
  const blob = await svgToPngBlob(fullSvg, outputSize, outputSize + extraH);

  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    throw new Error("Clipboard API not supported in this browser");
  }
}

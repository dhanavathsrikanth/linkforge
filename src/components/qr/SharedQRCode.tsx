"use client";

import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import { getQrDomain } from "@/lib/utils";

/**
 * The single source of truth for rendering a short-link's QR code.
 *
 * Every QR preview in the app — the cards on /dashboard/qr, the success
 * card on /dashboard/links, the live preview inside the create sheet —
 * renders through this component. It always derives the visual settings
 * from the link's persisted `qrSettings` (or the default if the link has
 * not been customized yet, or the persisted payload is partial).
 *
 * The `value` is always the canonical short URL stamped with `?source=qr`
 * so every scan is attributed to the QR analytics bucket by the redirect
 * handler. This component never re-implements its own copy of the URL
 * construction — callers pass the link, and we build the URL from it.
 */
export interface SharedQRCodeLink {
  id: string;
  slug: string;
  qrSettings?: QRSettings | null;
}

export interface SharedQRCodeProps {
  link: SharedQRCodeLink;
  /** Display size in CSS pixels. Defaults to 140. */
  size?: number;
  /** Container className for layout/styling. */
  className?: string;
  /** Override the host (defaults to the official main domain). */
  defaultDomain?: string;
  /**
   * When true, append `?source=qr` to the encoded URL so scans are
   * attributed to the per-QR analytics bucket. Defaults to true.
   */
  withSource?: boolean;
}

/**
 * Merge a partial `qrSettings` payload with the defaults so the QR never
 * breaks if the persisted record is missing a field (legacy rows, schema
 * drift, partial PATCH, etc.). Anything that the qrcode.react renderer
 * reads must be present here.
 */
function mergeSettings(stored: QRSettings | null | undefined): QRSettings {
  if (!stored || typeof stored !== "object") return { ...DEFAULT_QR_SETTINGS };
  return {
    ...DEFAULT_QR_SETTINGS,
    ...stored,
    // Defensive re-coerce for known string/enum fields so a corrupt row
    // can never produce an invalid QR (e.g. errorLevel="X").
    errorLevel: ["L", "M", "Q", "H"].includes(stored.errorLevel)
      ? stored.errorLevel
      : DEFAULT_QR_SETTINGS.errorLevel,
    frameStyle: stored.frameStyle === "scan-me" ? "scan-me" : "none",
    logoSize: ["small", "medium", "large"].includes(stored.logoSize as string)
      ? (stored.logoSize as QRSettings["logoSize"])
      : DEFAULT_QR_SETTINGS.logoSize,
  };
}

/**
 * The encoded URL inside the QR code **must** use the permanent production
 * domain (`getQrDomain()`) so the Cloudflare Worker handles the redirect
 * directly without touching Vercel or Clerk auth.  A Vercel preview host
 * like `pivoturl.vercel.app` would cause the Worker to proxy to Vercel,
 * where Clerk's auth middleware intercepts the request and rejects the
 * `redirect_url` parameter.
 *
 * The `defaultDomain` prop on `SharedQRCode` is only used for *display*
 * previews (e.g. showing the short URL text next to the QR), NOT for the
 * machine-readable QR content.
 */
function buildQrTargetUrl(slug: string, withSource: boolean): string {
  const host = `https://${getQrDomain()}`;
  return withSource ? `${host}/s/${slug}?source=qr` : `${host}/s/${slug}`;
}

/**
 * `SharedQRCode` is a thin wrapper that:
 * 1. Validates the link's persisted QR settings.
 * 2. Builds the canonical ?source=qr URL.
 * 3. Renders the SVG using qrcode.react with the right colours, logo,
 *    error-correction level, margin, and frame label.
 *
 * The rendered SVG element is forwarded via `ref` so callers can hook
 * download (PNG/SVG) helpers to it.
 */
export const SharedQRCode = forwardRef<SVGSVGElement, SharedQRCodeProps>(function SharedQRCode(
  { link, size = 140, className, defaultDomain, withSource = true },
  ref,
) {
  const settings = mergeSettings(link.qrSettings);
  const value = buildQrTargetUrl(link.slug, withSource);

  const logoPx =
    settings.logoSize === "small" ? 20 : settings.logoSize === "large" ? 36 : 28;

  return (
    <div
      className={className}
      style={{
        // Show a coloured backdrop only when not transparent so the QR
        // remains visible against any page background.
        backgroundColor: settings.bgColor === "transparent" ? "transparent" : settings.bgColor,
      }}
    >
      <QRCodeSVG
        ref={ref as React.Ref<SVGSVGElement>}
        value={value}
        size={size}
        fgColor={settings.fgColor}
        bgColor={settings.bgColor === "transparent" ? "transparent" : settings.bgColor}
        level={settings.errorLevel}
        marginSize={settings.marginSize ?? 0}
        boostLevel={settings.boostLevel ?? true}
        minVersion={settings.minVersion ?? 1}
        imageSettings={
          settings.logoUrl
            ? {
                src: settings.logoUrl,
                height: logoPx,
                width: logoPx,
                excavate: true,
                opacity: settings.logoOpacity ?? 1,
              }
            : undefined
        }
      />
      {settings.frameStyle === "scan-me" && (
        <p
          className="mt-1 text-center text-[10px] font-bold tracking-widest uppercase"
          style={{ color: settings.fgColor }}
        >
          {settings.frameText || "SCAN ME"}
        </p>
      )}
    </div>
  );
});

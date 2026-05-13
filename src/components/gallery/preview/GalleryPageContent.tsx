"use client";

import React, { useCallback } from "react";
import type { GalleryPage, GalleryLink, GalleryAppearance } from "@/types/gallery";
import { DEFAULT_APPEARANCE } from "@/types/gallery";

// ─── Font loader URLs ─────────────────────────────────────────────────────────
const FONT_URLS: Record<string, string> = {
  "Poppins": "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  "Space Mono": "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",
  "Playfair Display": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
};

// P5: Preload URLs — fetched eagerly so the font is ready before first paint
const FONT_PRELOAD_URLS: Record<string, string> = {
  "Poppins": "https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJDUc1NECPY.woff2",
  "Space Mono": "https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRaPpZUFWaHg.woff2",
  "Playfair Display": "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff2",
};

function getBgStyle(a: GalleryAppearance): React.CSSProperties {
  if (a.bgType === "gradient") {
    return {
      background: `linear-gradient(${a.gradientDir}deg, ${a.gradientFrom}, ${a.gradientTo})`,
    };
  }
  return { backgroundColor: a.bgColor };
}

function getButtonRadius(style: GalleryAppearance["buttonStyle"]): string {
  switch (style) {
    case "pill":   return "9999px";
    case "square": return "4px";
    case "shadow": return "12px";
    default:       return "12px";
  }
}

function getButtonShadow(style: GalleryAppearance["buttonStyle"]): string {
  return style === "shadow" ? "0 4px 24px rgba(0,0,0,0.28)" : "none";
}

interface GalleryPageContentProps {
  gallery: GalleryPage;
  /** If true, clicks are tracked via the API */
  trackClicks?: boolean;
  /** Compact mode for phone preview — scales things down */
  isPreview?: boolean;
}

export function GalleryPageContent({
  gallery,
  trackClicks = false,
  isPreview = false,
}: GalleryPageContentProps) {
  const a = gallery.appearance ?? DEFAULT_APPEARANCE;
  const visibleLinks = gallery.links.filter((l) => l.visible);

  const fontFamily = a.font === "Inter"
    ? `Inter, ui-sans-serif, system-ui, sans-serif`
    : `"${a.font}", ui-sans-serif, system-ui, sans-serif`;

  const handleLinkClick = useCallback(
    async (link: GalleryLink, idx: number) => {
      if (trackClicks) {
        try {
          await fetch("/api/v1/gallery-clicks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ galleryId: gallery.id, linkIndex: idx }),
            keepalive: true,
          });
        } catch {
          // best-effort
        }
      }
      window.open(link.url, "_blank", "noopener,noreferrer");
    },
    [gallery.id, trackClicks]
  );

  const initials = gallery.avatarInitials || gallery.displayName?.slice(0, 2).toUpperCase() || "LF";

  return (
    <>
      {/* P5: Font preload — prevents layout shift on published page */}
      {a.font !== "Inter" && FONT_PRELOAD_URLS[a.font] && (
        <link
          rel="preload"
          href={FONT_PRELOAD_URLS[a.font]}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      )}
      {/* Stylesheet injection (also loads the font declaration) */}
      {a.font !== "Inter" && (
        <link rel="stylesheet" href={FONT_URLS[a.font]} />
      )}

      <div
        style={{
          ...getBgStyle(a),
          fontFamily,
          minHeight: isPreview ? "100%" : "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: isPreview ? "24px 16px" : "48px 24px",
        }}
      >
        {/* Avatar */}
        <div style={{ marginBottom: isPreview ? 12 : 20 }}>
          {gallery.avatarUrl ? (
            <img
              src={gallery.avatarUrl}
              alt={gallery.displayName ?? "Avatar"}
              style={{
                width: isPreview ? 64 : 96,
                height: isPreview ? 64 : 96,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,0.25)",
              }}
            />
          ) : (
            <div
              style={{
                width: isPreview ? 64 : 96,
                height: isPreview ? 64 : 96,
                borderRadius: "50%",
                backgroundColor: gallery.avatarBgColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isPreview ? 22 : 34,
                fontWeight: 700,
                color: "#ffffff",
                border: "3px solid rgba(255,255,255,0.25)",
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Display name */}
        {gallery.displayName && (
          <h1
            style={{
              color: a.buttonTextColor === "#111111" ? "#111111" : "#ffffff",
              fontSize: isPreview ? 16 : 22,
              fontWeight: 700,
              margin: 0,
              marginBottom: 6,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {gallery.displayName}
          </h1>
        )}

        {/* Bio */}
        {gallery.bio && (
          <p
            style={{
              color: a.buttonTextColor === "#111111"
                ? "rgba(0,0,0,0.65)"
                : "rgba(255,255,255,0.75)",
              fontSize: isPreview ? 11 : 14,
              textAlign: "center",
              maxWidth: 280,
              lineHeight: 1.5,
              margin: "0 0 20px",
            }}
          >
            {gallery.bio}
          </p>
        )}

        {/* Links */}
        <div
          style={{
            width: "100%",
            maxWidth: isPreview ? 260 : 480,
            display: "flex",
            flexDirection: "column",
            gap: isPreview ? 8 : 12,
          }}
        >
          {visibleLinks.map((link, idx) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link, idx)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: isPreview ? "10px 16px" : "14px 24px",
                backgroundColor: a.buttonColor,
                color: a.buttonTextColor,
                borderRadius: getButtonRadius(a.buttonStyle),
                boxShadow: getButtonShadow(a.buttonStyle),
                border: "1px solid rgba(255,255,255,0.12)",
                cursor: "pointer",
                fontFamily,
                fontSize: isPreview ? 12 : 15,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                transition: "transform 0.15s ease, opacity 0.15s ease",
                textAlign: "center",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.opacity = "0.92";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
            >
              {link.emoji && (
                <span style={{ fontSize: isPreview ? 14 : 18 }}>{link.emoji}</span>
              )}
              {link.title}
            </button>
          ))}
        </div>

        {/* Powered by LinkForge — M4: UTM-tagged for viral growth tracking */}
        {gallery.showBranding && (
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://linkfor.ge"}?utm_source=bio&utm_medium=branding&utm_campaign=${gallery.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: isPreview ? 20 : 40,
              color: a.buttonTextColor === "#111111"
                ? "rgba(0,0,0,0.4)"
                : "rgba(255,255,255,0.4)",
              fontSize: isPreview ? 9 : 12,
              textDecoration: "none",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            ⚡ Made with LinkForge
          </a>
        )}
      </div>
    </>
  );
}

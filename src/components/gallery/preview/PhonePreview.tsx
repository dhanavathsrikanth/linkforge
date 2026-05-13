"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { GalleryPageContent } from "./GalleryPageContent";
import type { GalleryPage } from "@/types/gallery";

interface PhonePreviewProps {
  gallery: GalleryPage;
}

export function PhonePreview({ gallery }: PhonePreviewProps) {
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");

  return (
    <div className="flex flex-col items-center gap-5 h-full">
      {/* Toggle */}
      <div className="flex items-center gap-1 p-1 bg-black/10 rounded-xl border border-white/10">
        <button
          onClick={() => setMode("mobile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === "mobile"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mobile
        </button>
        <button
          onClick={() => setMode("desktop")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === "desktop"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Desktop
        </button>
      </div>

      {mode === "mobile" ? (
        <MobileFrame gallery={gallery} />
      ) : (
        <DesktopFrame gallery={gallery} />
      )}
    </div>
  );
}

function MobileFrame({ gallery }: { gallery: GalleryPage }) {
  return (
    <div className="relative" style={{ width: 280 }}>
      {/* Phone shell */}
      <svg
        viewBox="0 0 280 570"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10 }}
      >
        {/* Outer frame */}
        <rect x="1" y="1" width="278" height="568" rx="40" fill="#1a1a2e" stroke="#333350" strokeWidth="2" />
        {/* Inner bezel */}
        <rect x="10" y="10" width="260" height="550" rx="33" fill="#0d0d1a" />
        {/* Screen area */}
        <rect x="14" y="14" width="252" height="542" rx="30" fill="transparent" />
        {/* Notch */}
        <rect x="105" y="16" width="70" height="22" rx="11" fill="#0d0d1a" />
        {/* Dynamic island pill */}
        <rect x="113" y="20" width="54" height="14" rx="7" fill="#1a1a2e" />
        {/* Side button */}
        <rect x="276" y="140" width="5" height="60" rx="2.5" fill="#333350" />
        {/* Volume buttons */}
        <rect x="-1" y="130" width="4" height="40" rx="2" fill="#333350" />
        <rect x="-1" y="180" width="4" height="40" rx="2" fill="#333350" />
        {/* Bottom bar */}
        <rect x="100" y="548" width="80" height="4" rx="2" fill="#333350" />
      </svg>

      {/* Scrollable content inside phone */}
      <div
        style={{
          position: "relative",
          width: 280,
          height: 570,
          borderRadius: 40,
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            right: 14,
            bottom: 14,
            borderRadius: 30,
            overflow: "hidden",
          }}
        >
          {/* Status bar */}
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              zIndex: 5,
              position: "relative",
              flexShrink: 0,
            }}
          >
            <span>9:41</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div>
          {/* M7: Content scrollable inside fixed frame — max-height locks to phone screen */}
          <div
            style={{
              height: "calc(100% - 40px)",
              overflowY: "auto",
              overflowX: "hidden",
              // Prevent content from breaking out of the phone frame
              maxHeight: 516,
            }}
          >
            <GalleryPageContent gallery={gallery} isPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopFrame({ gallery }: { gallery: GalleryPage }) {
  return (
    <div style={{ width: "100%", maxWidth: 540 }}>
      {/* Browser chrome */}
      <div
        style={{
          background: "#1e1e2e",
          borderRadius: "12px 12px 0 0",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "monospace",
          }}
        >
          linkfor.ge/{gallery.slug}
        </div>
      </div>
      {/* Page viewport */}
      <div
        style={{
          height: 420,
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0 0 12px 12px",
        }}
      >
        <GalleryPageContent gallery={gallery} isPreview />
      </div>
    </div>
  );
}

// Micro icon components
function SignalIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
      <rect x="0" y="6" width="2" height="4" rx="1" opacity="1" />
      <rect x="3" y="4" width="2" height="6" rx="1" opacity="1" />
      <rect x="6" y="2" width="2" height="8" rx="1" opacity="1" />
      <rect x="9" y="0" width="2" height="10" rx="1" opacity="1" />
      <rect x="12" y="0" width="2" height="10" rx="1" opacity="0.3" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
      <path d="M7 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      <path d="M4 6.5C4.8 5.7 5.8 5.2 7 5.2s2.2.5 3 1.3l.9-.9A5.2 5.2 0 0 0 7 4 5.2 5.2 0 0 0 3.1 5.6L4 6.5z" />
      <path d="M7 2C4.5 2 2.3 3 .7 4.7L1.6 5.6A7.6 7.6 0 0 1 7 3.2 7.6 7.6 0 0 1 12.4 5.6l.9-.9A9.6 9.6 0 0 0 7 2z" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="currentColor">
      <rect x="0" y="1" width="17" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="17.5" y="3" width="2.5" height="4" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="1.5" y="2.5" width="11" height="5" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

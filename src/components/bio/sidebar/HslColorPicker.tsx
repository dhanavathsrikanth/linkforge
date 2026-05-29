"use client";

import { useRef, useState } from "react";
import type { HSLColor } from "@/lib/bio/theme";
import { hslToHex } from "@/lib/bio/theme";

// ─── Conversion helpers ───────────────────────────────────────────────────────

/**
 * Convert a 6-digit hex string (no #) to HSL.
 * Returns values in the same fractional format used by BioThemeColors
 * (h: 0-360, s: 0-1, l: 0-1).
 */
function hexToHsl(hex: string): HSLColor {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: parseFloat(s.toFixed(4)), l: parseFloat(l.toFixed(4)) };
}

// ─── HslColorPicker ───────────────────────────────────────────────────────────

interface HslColorPickerProps {
  label: string;
  value: HSLColor | null | undefined;
  onChange: (color: HSLColor) => void;
}

export function HslColorPicker({ label, value, onChange }: HslColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert stored HSL → hex for the native color input
  const hexValue = value
    ? `#${hslToHex(value)}`
    : "#ffffff";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value.replace("#", "");
    if (hex.length === 6) {
      onChange(hexToHsl(hex));
    }
  }

  const previewBg = value
    ? `hsl(${value.h}deg ${value.s * 100}% ${value.l * 100}%)`
    : "#ffffff";

  return (
    <div className="flex items-center gap-2">
      {/* Color swatch — clicking opens the native picker */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-8 h-8 rounded-lg border border-stone-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
        style={{ backgroundColor: previewBg }}
        aria-label={`Pick color for ${label}`}
      />

      {/* Hidden native color input */}
      <input
        ref={inputRef}
        type="color"
        value={hexValue}
        onChange={handleChange}
        className="sr-only"
        aria-label={label}
      />

      {/* Label + hex value */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-stone-700 truncate">{label}</span>
        <span className="text-xs font-mono text-stone-400">{hexValue.toUpperCase()}</span>
      </div>
    </div>
  );
}

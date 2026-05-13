"use client";

import type { GalleryAppearance, ButtonStyle, GalleryFont, PresetTheme } from "@/types/gallery";
import { PRESET_THEMES } from "@/types/gallery";

const PRESET_META: { key: PresetTheme; label: string; emoji: string }[] = [
  { key: "dark",   label: "Dark",   emoji: "🌑" },
  { key: "light",  label: "Light",  emoji: "☀️" },
  { key: "ocean",  label: "Ocean",  emoji: "🌊" },
  { key: "sunset", label: "Sunset", emoji: "🌅" },
  { key: "forest", label: "Forest", emoji: "🌲" },
  { key: "purple", label: "Purple", emoji: "💜" },
];

const BUTTON_STYLES: { value: ButtonStyle; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "pill",    label: "Pill" },
  { value: "square",  label: "Square" },
  { value: "shadow",  label: "Shadow" },
];

const FONTS: GalleryFont[] = ["Inter", "Poppins", "Space Mono", "Playfair Display"];

interface AppearanceSectionProps {
  appearance: GalleryAppearance;
  onUpdate: (patch: Partial<GalleryAppearance>) => void;
}

export function AppearanceSection({ appearance: a, onUpdate }: AppearanceSectionProps) {
  return (
    <div className="space-y-5">
      {/* Preset themes */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Themes
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_META.map(({ key, label, emoji }) => {
            const theme = PRESET_THEMES[key];
            const isActive = a.preset === key;
            return (
              <button
                key={key}
                onClick={() => onUpdate({ ...PRESET_THEMES[key] })}
                className={`relative rounded-xl p-3 border-2 transition-all text-left overflow-hidden ${
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
                style={{
                  background: theme.bgType === "gradient"
                    ? `linear-gradient(${theme.gradientDir}deg, ${theme.gradientFrom}, ${theme.gradientTo})`
                    : theme.bgColor,
                }}
              >
                <div className="text-base mb-0.5">{emoji}</div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: theme.buttonTextColor }}
                >
                  {label}
                </div>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Background type */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Background
        </label>
        <div className="flex gap-2 mb-3">
          {(["solid", "gradient"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onUpdate({ bgType: type })}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize ${
                a.bgType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {a.bgType === "solid" ? (
          <ColorRow
            label="Color"
            value={a.bgColor}
            onChange={(v) => onUpdate({ bgColor: v, preset: undefined })}
          />
        ) : (
          <div className="space-y-2">
            <ColorRow
              label="From"
              value={a.gradientFrom}
              onChange={(v) => onUpdate({ gradientFrom: v, preset: undefined })}
            />
            <ColorRow
              label="To"
              value={a.gradientTo}
              onChange={(v) => onUpdate({ gradientTo: v, preset: undefined })}
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-14">Angle</label>
              <input
                type="range"
                min={0}
                max={360}
                value={a.gradientDir}
                onChange={(e) => onUpdate({ gradientDir: Number(e.target.value), preset: undefined })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground tabular-nums w-10">
                {a.gradientDir}°
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Button style */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Button Style
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {BUTTON_STYLES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onUpdate({ buttonStyle: value })}
              className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                a.buttonStyle === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Button + text colors */}
      <div className="grid grid-cols-2 gap-3">
        <ColorRow
          label="Button Color"
          value={a.buttonColor.startsWith("rgba") ? "#1e1e2e" : a.buttonColor}
          onChange={(v) => onUpdate({ buttonColor: v })}
        />
        <ColorRow
          label="Text Color"
          value={a.buttonTextColor}
          onChange={(v) => onUpdate({ buttonTextColor: v })}
        />
      </div>

      {/* Font */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Font
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FONTS.map((font) => (
            <button
              key={font}
              onClick={() => onUpdate({ font })}
              className={`py-2 px-3 text-xs rounded-lg border transition-all text-left truncate ${
                a.font === font
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
              style={{
                fontFamily: font === "Inter"
                  ? "Inter, sans-serif"
                  : `"${font}", sans-serif`,
              }}
            >
              {font}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground w-20 shrink-0">{label}</label>
      <label className="flex items-center gap-2 flex-1 cursor-pointer group">
        <div
          className="w-8 h-8 rounded-lg border border-border shadow-sm group-hover:ring-2 group-hover:ring-primary/30 transition-all shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
          {value}
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { HslColorPicker } from "./HslColorPicker";
import { FontSelector } from "./FontSelector";
import type { HSLColor, BioThemeColors } from "@/lib/bio/theme";
import { DEFAULT_THEMES, generateSysThemeCss } from "@/lib/bio/theme";
import { getGoogleFontUrl } from "@/lib/bio/fonts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeFormData {
  name: string;
  font: string | null;
  backgroundImage: string | null;
  colors: Partial<BioThemeColors>;
}

interface CreateEditThemeFormProps {
  /** "create" = new theme, "edit" = update existing */
  action: "create" | "edit";
  /** Populated when action = "edit" */
  initialData?: {
    id: string;
    name: string;
    font: string | null;
    backgroundImage: string | null;
    colorBgBase: HSLColor | null;
    colorBgPrimary: HSLColor | null;
    colorBgSecondary: HSLColor | null;
    colorBorderPrimary: HSLColor | null;
    colorTitlePrimary: HSLColor | null;
    colorTitleSecondary: HSLColor | null;
    colorLabelPrimary: HSLColor | null;
    colorLabelSecondary: HSLColor | null;
    colorLabelTertiary: HSLColor | null;
  };
  onSuccess: (themeId: string) => void;
  onCancel: () => void;
}

// ─── Default colors (from Default theme) ─────────────────────────────────────

const DEFAULT_COLORS = DEFAULT_THEMES.Default.colors;

// ─── Color field definitions ──────────────────────────────────────────────────

const COLOR_FIELDS: { id: keyof BioThemeColors; label: string }[] = [
  { id: "colorBgBase",        label: "Page background" },
  { id: "colorBgPrimary",     label: "Card background" },
  { id: "colorBgSecondary",   label: "Secondary background" },
  { id: "colorBorderPrimary", label: "Border" },
  { id: "colorTitlePrimary",  label: "Title" },
  { id: "colorTitleSecondary",label: "Subtitle" },
  { id: "colorLabelPrimary",  label: "Primary text" },
  { id: "colorLabelSecondary",label: "Secondary text" },
  { id: "colorLabelTertiary", label: "Tertiary text" },
];

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
      >
        <span className="text-xs font-semibold text-stone-700">{title}</span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        )}
      </button>
      {open && <div className="px-3 py-3 bg-white space-y-3">{children}</div>}
    </div>
  );
}

// ─── Live preview injector ────────────────────────────────────────────────────

function LivePreviewStyle({ colors, font }: { colors: Partial<BioThemeColors>; font: string | null }) {
  const merged: BioThemeColors = {
    colorBgBase:        colors.colorBgBase        ?? DEFAULT_COLORS.colorBgBase,
    colorBgPrimary:     colors.colorBgPrimary     ?? DEFAULT_COLORS.colorBgPrimary,
    colorBgSecondary:   colors.colorBgSecondary   ?? DEFAULT_COLORS.colorBgSecondary,
    colorBorderPrimary: colors.colorBorderPrimary ?? DEFAULT_COLORS.colorBorderPrimary,
    colorTitlePrimary:  colors.colorTitlePrimary  ?? DEFAULT_COLORS.colorTitlePrimary,
    colorTitleSecondary:colors.colorTitleSecondary?? DEFAULT_COLORS.colorTitleSecondary,
    colorLabelPrimary:  colors.colorLabelPrimary  ?? DEFAULT_COLORS.colorLabelPrimary,
    colorLabelSecondary:colors.colorLabelSecondary?? DEFAULT_COLORS.colorLabelSecondary,
    colorLabelTertiary: colors.colorLabelTertiary ?? DEFAULT_COLORS.colorLabelTertiary,
  };
  // generateSysThemeCss already injects --sys-font when font is provided.
  // Doubled `.themed` selector wins over both the saved-theme injection
  // and the no-theme fallback so the live editor preview always shows
  // the in-progress colours.
  const PREVIEW_SELECTOR = ".bio-canvas-root.themed.themed";
  const css = generateSysThemeCss(merged, font, null, PREVIEW_SELECTOR);
  // Also apply the font-family directly to the canvas root so all text updates immediately
  const fontCss = font
    ? `${PREVIEW_SELECTOR} { font-family: '${font}', sans-serif; }`
    : "";
  return <style dangerouslySetInnerHTML={{ __html: css + "\n" + fontCss }} />;
}

// ─── CreateEditThemeForm ──────────────────────────────────────────────────────

export function CreateEditThemeForm({
  action,
  initialData,
  onSuccess,
  onCancel,
}: CreateEditThemeFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [font, setFont] = useState<string | null>(initialData?.font ?? null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(
    initialData?.backgroundImage ?? null
  );
  const [colors, setColors] = useState<Partial<BioThemeColors>>({
    colorBgBase:        initialData?.colorBgBase        ?? DEFAULT_COLORS.colorBgBase,
    colorBgPrimary:     initialData?.colorBgPrimary     ?? DEFAULT_COLORS.colorBgPrimary,
    colorBgSecondary:   initialData?.colorBgSecondary   ?? DEFAULT_COLORS.colorBgSecondary,
    colorBorderPrimary: initialData?.colorBorderPrimary ?? DEFAULT_COLORS.colorBorderPrimary,
    colorTitlePrimary:  initialData?.colorTitlePrimary  ?? DEFAULT_COLORS.colorTitlePrimary,
    colorTitleSecondary:initialData?.colorTitleSecondary?? DEFAULT_COLORS.colorTitleSecondary,
    colorLabelPrimary:  initialData?.colorLabelPrimary  ?? DEFAULT_COLORS.colorLabelPrimary,
    colorLabelSecondary:initialData?.colorLabelSecondary?? DEFAULT_COLORS.colorLabelSecondary,
    colorLabelTertiary: initialData?.colorLabelTertiary ?? DEFAULT_COLORS.colorLabelTertiary,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the selected font so the canvas live preview renders it
  useEffect(() => {
    if (!font) return;
    const url = getGoogleFontUrl(font);
    if (!url || document.querySelector(`link[href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [font]);

  function setColor(id: keyof BioThemeColors, value: HSLColor) {
    setColors((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Theme name is required."); return; }
    setError(null);
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        font: font ?? null,
        backgroundImage: backgroundImage ?? null,
        colors,
      };

      let res: Response;
      if (action === "create") {
        res = await fetch("/api/bio/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/bio/themes/${initialData!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Failed to save theme");
      }

      const body = await res.json();
      const themeId = body.theme?.id ?? initialData?.id ?? "";
      onSuccess(themeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Live preview — updates canvas as user edits */}
      <LivePreviewStyle colors={colors} font={font} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Theme name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-stone-600">Theme name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My custom theme"
            required
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Font */}
        <Section title="Font" defaultOpen>
          <FontSelector value={font} onChange={setFont} />
        </Section>

        {/* Background image */}
        <Section title="Background image">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-500">Image URL (optional)</label>
            <input
              type="url"
              value={backgroundImage ?? ""}
              onChange={(e) => setBackgroundImage(e.target.value || null)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {backgroundImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backgroundImage}
                alt="Background preview"
                className="mt-1 w-full h-16 object-cover rounded-lg border border-stone-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
        </Section>

        {/* Colors */}
        <Section title="Colors" defaultOpen>
          <div className="flex flex-col gap-3">
            {COLOR_FIELDS.map(({ id, label }) => (
              <HslColorPicker
                key={id}
                label={label}
                value={colors[id]}
                onChange={(v) => setColor(id, v)}
              />
            ))}
          </div>
        </Section>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {action === "create" ? "Create theme" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  );
}

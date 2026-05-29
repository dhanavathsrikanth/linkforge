"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Check, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import {
  DEFAULT_THEMES,
  type ThemeName,
  hslToCssValue,
  generateSysThemeCss,
  type HSLColor,
  type BioThemeColors,
} from "@/lib/bio/theme";
import { getGoogleFontUrl } from "@/lib/bio/fonts";
import { CreateEditThemeForm } from "./CreateEditThemeForm";
import { cn } from "@/lib/utils";

// ─── DB theme shape (from /api/bio/themes) ────────────────────────────────────

interface DbTheme {
  id: string;
  name: string;
  isDefault: boolean;
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
}

// ─── Mini theme card ──────────────────────────────────────────────────────────

function ThemeCard({
  name,
  colors,
  font,
  isActive,
  isCustom,
  onClick,
  onHoverStart,
  onHoverEnd,
  onEdit,
  onDelete,
}: {
  name: string;
  colors: {
    colorBgBase: HSLColor;
    colorBgPrimary: HSLColor;
    colorBorderPrimary: HSLColor;
    colorLabelPrimary: HSLColor;
    colorLabelSecondary: HSLColor;
    colorTitlePrimary: HSLColor;
  };
  font: string | null;
  isActive: boolean;
  isCustom: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const bgBase      = `hsl(${hslToCssValue(colors.colorBgBase)})`;
  const bgPrimary   = `hsl(${hslToCssValue(colors.colorBgPrimary)})`;
  const border      = `hsl(${hslToCssValue(colors.colorBorderPrimary)})`;
  const labelPri    = `hsl(${hslToCssValue(colors.colorLabelPrimary)})`;
  const labelSec    = `hsl(${hslToCssValue(colors.colorLabelSecondary)})`;
  const titlePri    = `hsl(${hslToCssValue(colors.colorTitlePrimary)})`;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        className={cn(
          "w-full text-left rounded-xl overflow-hidden transition-all cursor-pointer",
          isActive
            ? "ring-2 ring-primary shadow-md"
            : "ring-1 ring-stone-200 hover:ring-stone-300"
        )}
      >
        {/* Mini canvas preview */}
        <div className="p-2 space-y-1.5" style={{ backgroundColor: bgBase }}>
          <div
            className="rounded-lg p-2 flex items-center gap-2"
            style={{ backgroundColor: bgPrimary, border: `1px solid ${border}` }}
          >
            <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: labelPri }} />
            <div className="flex flex-col gap-1 flex-1">
              <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: titlePri }} />
              <div className="h-1 rounded w-1/2" style={{ backgroundColor: labelSec }} />
            </div>
          </div>
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: bgPrimary, border: `1px solid ${border}` }}
          >
            <div className="h-1.5 rounded w-2/3" style={{ backgroundColor: labelPri }} />
            <div className="h-1 rounded w-1/3 mt-1" style={{ backgroundColor: labelSec }} />
          </div>
          <div className="flex gap-1.5">
            {[0.6, 0.4].map((w, i) => (
              <div
                key={i}
                className="rounded-md p-1.5 flex-1"
                style={{ backgroundColor: bgPrimary, border: `1px solid ${border}`, flexBasis: `${w * 100}%` }}
              >
                <div className="h-1 rounded" style={{ backgroundColor: labelSec }} />
              </div>
            ))}
          </div>
        </div>

        {/* Label row */}
        <div className="px-2 py-1.5 bg-white border-t border-stone-100 flex items-center justify-between">
          <span
            className="text-xs font-medium text-stone-800 truncate"
            style={font ? { fontFamily: `'${font}', sans-serif` } : undefined}
          >
            {name}
          </span>
          {isActive && <Check className="w-3 h-3 text-primary shrink-0" />}
        </div>
      </button>

      {/* Edit / Delete actions for custom themes */}
      {isCustom && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-stone-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Live preview style injector ──────────────────────────────────────────────

function PreviewThemeStyle({
  themeId,
  allThemes,
}: {
  themeId: string | null;
  allThemes: DbTheme[];
}) {
  if (!themeId) return null;

  // Use a doubled `.themed` selector so the preview wins over the saved
  // theme injected by `ThemeStyle` (which uses `.bio-canvas-root.themed`).
  // CSS treats `.themed.themed` as higher specificity than `.themed`.
  const PREVIEW_SELECTOR = ".bio-canvas-root.themed.themed";

  // Check built-in themes first
  const builtIn = Object.entries(DEFAULT_THEMES).find(([, t]) => t.id === themeId);
  if (builtIn) {
    const [, theme] = builtIn;
    const css = generateSysThemeCss(theme.colors, theme.font, null, PREVIEW_SELECTOR);
    return <style dangerouslySetInnerHTML={{ __html: css }} />;
  }

  // Custom theme
  const custom = allThemes.find((t) => t.id === themeId);
  if (!custom) return null;

  const DEFAULT = DEFAULT_THEMES.Default.colors;
  const colors: BioThemeColors = {
    colorBgBase:        custom.colorBgBase        ?? DEFAULT.colorBgBase,
    colorBgPrimary:     custom.colorBgPrimary     ?? DEFAULT.colorBgPrimary,
    colorBgSecondary:   custom.colorBgSecondary   ?? DEFAULT.colorBgSecondary,
    colorBorderPrimary: custom.colorBorderPrimary ?? DEFAULT.colorBorderPrimary,
    colorTitlePrimary:  custom.colorTitlePrimary  ?? DEFAULT.colorTitlePrimary,
    colorTitleSecondary:custom.colorTitleSecondary?? DEFAULT.colorTitleSecondary,
    colorLabelPrimary:  custom.colorLabelPrimary  ?? DEFAULT.colorLabelPrimary,
    colorLabelSecondary:custom.colorLabelSecondary?? DEFAULT.colorLabelSecondary,
    colorLabelTertiary: custom.colorLabelTertiary ?? DEFAULT.colorLabelTertiary,
  };
  const css = generateSysThemeCss(colors, custom.font, null, PREVIEW_SELECTOR);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

// ─── SidebarThemes ────────────────────────────────────────────────────────────

type View = "list" | "create" | "edit";

interface SidebarThemesProps {
  activeThemeId?: string | null;
  onSelectTheme: (themeId: string) => void;
}

export function SidebarThemes({ activeThemeId, onSelectTheme }: SidebarThemesProps) {
  const [view, setView] = useState<View>("list");
  const [editingTheme, setEditingTheme] = useState<DbTheme | null>(null);
  const [hoverThemeId, setHoverThemeId] = useState<string | null>(null);
  const [customThemes, setCustomThemes] = useState<DbTheme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch custom themes ─────────────────────────────────────────────────────
  const fetchThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/bio/themes");
      if (!res.ok) return;
      const { themes } = await res.json();
      // Filter out built-in (isDefault) themes — we show those from DEFAULT_THEMES
      setCustomThemes((themes as DbTheme[]).filter((t) => !t.isDefault));
    } catch {
      // non-blocking
    } finally {
      setLoadingThemes(false);
    }
  }, []);

  useEffect(() => { fetchThemes(); }, [fetchThemes]);

  // ── Font loading for hover/active preview ───────────────────────────────────
  const previewThemeId = hoverThemeId ?? activeThemeId;
  const allThemes = customThemes;

  useEffect(() => {
    if (!previewThemeId) return;
    const builtIn = Object.values(DEFAULT_THEMES).find((t) => t.id === previewThemeId);
    const font = builtIn?.font ?? allThemes.find((t) => t.id === previewThemeId)?.font;
    if (!font) return;
    const url = getGoogleFontUrl(font);
    if (!url || document.querySelector(`link[href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [previewThemeId, allThemes]);

  // ── Delete custom theme ─────────────────────────────────────────────────────
  async function handleDelete(themeId: string) {
    if (!confirm("Delete this theme? This cannot be undone.")) return;
    setDeletingId(themeId);
    try {
      const res = await fetch(`/api/bio/themes/${themeId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error ?? "Failed to delete theme. Please try again.");
        return;
      }
      await fetchThemes();
      // If the deleted theme was active, reset to default
      if (activeThemeId === themeId) {
        onSelectTheme(DEFAULT_THEMES.Default.id);
      }
    } finally {
      setDeletingId(null);
    }
  }

  // ── Form success ────────────────────────────────────────────────────────────
  function handleFormSuccess(themeId: string) {
    fetchThemes();
    onSelectTheme(themeId);
    setView("list");
    setEditingTheme(null);
  }

  const builtInEntries = Object.entries(DEFAULT_THEMES) as [ThemeName, typeof DEFAULT_THEMES[ThemeName]][];

  // ── Create / Edit view ──────────────────────────────────────────────────────
  if (view === "create" || view === "edit") {
    return (
      <div className="flex flex-col h-full">
        {/* Live preview while editing */}
        <PreviewThemeStyle themeId={hoverThemeId ?? activeThemeId ?? null} allThemes={allThemes} />

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
          <button
            type="button"
            onClick={() => { setView("list"); setEditingTheme(null); }}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to themes
          </button>
          <h2 className="text-sm font-semibold text-stone-900">
            {view === "create" ? "Create theme" : "Edit theme"}
          </h2>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <CreateEditThemeForm
            action={view}
            initialData={editingTheme ?? undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => { setView("list"); setEditingTheme(null); }}
          />
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Live preview on hover */}
      <PreviewThemeStyle themeId={hoverThemeId ?? activeThemeId ?? null} allThemes={allThemes} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Themes</h2>
        <button
          type="button"
          onClick={() => setView("create")}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ── Built-in themes ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-2 px-0.5">
            Built-in
          </p>
          <div className="grid grid-cols-2 gap-3">
            {builtInEntries.map(([name, theme]) => (
              <ThemeCard
                key={theme.id}
                name={name}
                colors={theme.colors}
                font={theme.font}
                isActive={activeThemeId === theme.id}
                isCustom={false}
                onClick={() => { onSelectTheme(theme.id); setHoverThemeId(null); }}
                onHoverStart={() => setHoverThemeId(theme.id)}
                onHoverEnd={() => setHoverThemeId(null)}
              />
            ))}
          </div>
        </div>

        {/* ── Custom themes ────────────────────────────────────────────────── */}
        {(loadingThemes || customThemes.length > 0) && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-2 px-0.5">
              Custom
            </p>
            {loadingThemes ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {customThemes.map((theme) => {
                  const DEFAULT = DEFAULT_THEMES.Default.colors;
                  const colors = {
                    colorBgBase:        theme.colorBgBase        ?? DEFAULT.colorBgBase,
                    colorBgPrimary:     theme.colorBgPrimary     ?? DEFAULT.colorBgPrimary,
                    colorBorderPrimary: theme.colorBorderPrimary ?? DEFAULT.colorBorderPrimary,
                    colorLabelPrimary:  theme.colorLabelPrimary  ?? DEFAULT.colorLabelPrimary,
                    colorLabelSecondary:theme.colorLabelSecondary?? DEFAULT.colorLabelSecondary,
                    colorTitlePrimary:  theme.colorTitlePrimary  ?? DEFAULT.colorTitlePrimary,
                  };
                  return (
                    <ThemeCard
                      key={theme.id}
                      name={theme.name}
                      colors={colors}
                      font={theme.font}
                      isActive={activeThemeId === theme.id}
                      isCustom
                      onClick={() => { onSelectTheme(theme.id); setHoverThemeId(null); }}
                      onHoverStart={() => setHoverThemeId(theme.id)}
                      onHoverEnd={() => setHoverThemeId(null)}
                      onEdit={() => { setEditingTheme(theme); setView("edit"); }}
                      onDelete={() => handleDelete(theme.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-stone-400 text-center pb-2">
          Hover a theme to preview it live on the canvas
        </p>
      </div>
    </div>
  );
}

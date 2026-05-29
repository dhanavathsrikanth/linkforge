"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  getAvailableFonts,
  getFontsByCategory,
  getGoogleFontUrl,
  getFontFamilyValue,
  type FontEntry,
} from "@/lib/bio/fonts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "all" | FontEntry["category"];

const CATEGORY_TABS: { id: Category; label: string }[] = [
  { id: "all",        label: "All" },
  { id: "sans-serif", label: "Sans" },
  { id: "serif",      label: "Serif" },
  { id: "monospace",  label: "Mono" },
];

const ALL_FONTS = getAvailableFonts();

// ─── Font loader ──────────────────────────────────────────────────────────────

const loadedFontUrls = new Set<string>();

function loadFont(fontName: string) {
  const url = getGoogleFontUrl(fontName);
  if (!url || loadedFontUrls.has(url)) return;
  if (document.querySelector(`link[href="${url}"]`)) {
    loadedFontUrls.add(url);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
  loadedFontUrls.add(url);
}

// ─── FontSelector ─────────────────────────────────────────────────────────────

interface FontSelectorProps {
  value: string | null | undefined;
  onChange: (font: string | null) => void;
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load the currently selected font immediately
  useEffect(() => {
    if (value) loadFont(value);
  }, [value]);

  // Preload first 5 fonts on mount for instant preview
  useEffect(() => {
    ALL_FONTS.slice(0, 5).forEach(loadFont);
  }, []);

  // Load all fonts when dropdown opens
  function handleOpen() {
    setOpen(true);
    ALL_FONTS.forEach(loadFont);
    // Focus search after paint
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Filtered font list
  const filtered = useMemo(() => {
    let list = category === "all" ? ALL_FONTS : getFontsByCategory(category as FontEntry["category"]);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  const displayLabel = value ?? "Default (Inter)";

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 hover:border-stone-300 transition-colors cursor-pointer"
      >
        <span
          className="truncate"
          style={value ? { fontFamily: getFontFamilyValue(value) } : undefined}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-stone-400 shrink-0 ml-2 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden flex flex-col">
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-stone-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fonts…"
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-stone-100">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  category === tab.id
                    ? "bg-primary text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Font list */}
          <div className="overflow-y-auto max-h-56">
            {/* Default option */}
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-stone-50 transition-colors cursor-pointer border-b border-stone-100",
                !value && "bg-primary/5"
              )}
            >
              <span className="text-stone-500 text-xs">Default (Inter)</span>
              {!value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-xs text-stone-400">
                No fonts match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => { onChange(font); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-50 transition-colors cursor-pointer",
                    value === font && "bg-primary/5"
                  )}
                >
                  {/* Font name rendered in its own typeface */}
                  <span
                    className="text-sm text-stone-800"
                    style={{ fontFamily: getFontFamilyValue(font) }}
                  >
                    {font}
                  </span>
                  {value === font && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

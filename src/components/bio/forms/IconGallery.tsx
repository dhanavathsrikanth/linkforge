"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRAND_ICONS,
  CATEGORIES,
  iconUrl,
  iconUrlGray,
  type BrandIcon,
  type Category,
} from "./icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IconGalleryProps {
  /** Currently selected icon URL (may be a Simple Icons URL or any other URL) */
  value: string;
  /** Called with the full CDN URL of the selected icon */
  onChange: (url: string) => void;
}

// ─── Color mode toggle ────────────────────────────────────────────────────────

type ColorMode = "color" | "gray";

// ─── Single icon tile ─────────────────────────────────────────────────────────

function IconTile({
  icon,
  isSelected,
  colorMode,
  onClick,
}: {
  icon: BrandIcon;
  isSelected: boolean;
  colorMode: ColorMode;
  onClick: () => void;
}) {
  const src = colorMode === "color" ? iconUrl(icon) : iconUrlGray(icon);

  return (
    <button
      type="button"
      onClick={onClick}
      title={icon.label}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all cursor-pointer group",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-transparent bg-white hover:border-stone-200 hover:bg-stone-50"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={icon.label}
        className="w-5 h-5 object-contain"
        loading="lazy"
        onError={(e) => {
          // Hide broken icons gracefully
          (e.target as HTMLImageElement).style.opacity = "0.2";
        }}
      />
      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// ─── IconGallery ──────────────────────────────────────────────────────────────

export function IconGallery({ value, onChange }: IconGalleryProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [colorMode, setColorMode] = useState<ColorMode>("color");

  // Filter icons by search + category
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return BRAND_ICONS.filter((icon) => {
      const matchesSearch = !q || icon.label.toLowerCase().includes(q) || icon.slug.includes(q);
      const matchesCategory = activeCategory === "all" || icon.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  // Determine if the current value matches a known icon
  function isIconSelected(icon: BrandIcon): boolean {
    const colorUrl = iconUrl(icon);
    const grayUrl = iconUrlGray(icon);
    return value === colorUrl || value === grayUrl;
  }

  function handleSelect(icon: BrandIcon) {
    const url = colorMode === "color" ? iconUrl(icon) : iconUrlGray(icon);
    onChange(url);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
          className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Category tabs + color mode toggle */}
      <div className="flex items-center justify-between gap-2">
        {/* Category scroll */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "shrink-0 px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
              activeCategory === "all"
                ? "bg-primary text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "shrink-0 px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-primary text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Color mode toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => setColorMode("color")}
            className={cn(
              "px-2 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer",
              colorMode === "color"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            Color
          </button>
          <button
            type="button"
            onClick={() => setColorMode("gray")}
            className={cn(
              "px-2 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer",
              colorMode === "gray"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            Gray
          </button>
        </div>
      </div>

      {/* Icon grid */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-2 max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-stone-400">
            No icons match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1">
            {filtered.map((icon) => (
              <IconTile
                key={`${icon.slug}-${icon.category}`}
                icon={icon}
                isSelected={isIconSelected(icon)}
                colorMode={colorMode}
                onClick={() => handleSelect(icon)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected preview */}
      {value && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white rounded-lg border border-stone-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Selected icon"
            className="w-5 h-5 object-contain shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-xs text-stone-500 truncate flex-1 font-mono">
            {value.replace("https://cdn.simpleicons.org/", "simpleicons/")}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

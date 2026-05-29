"use client";

import { useState } from "react";
import { Upload, Link, LayoutGrid } from "lucide-react";
import { FileUpload } from "./FileUpload";
import { IconGallery } from "./IconGallery";
import { TextInput } from "./shared";
import { cn } from "@/lib/utils";
import { isSimpleIconUrl } from "./icons";

// ─── ImageOrUrlInput ──────────────────────────────────────────────────────────
// Three-tab input for icon/image fields:
//   Gallery — searchable brand icon grid (Simple Icons CDN)
//   Upload  — drag-drop file upload → stored in Neon as base64
//   URL     — plain text input for any external image URL

interface ImageOrUrlInputProps {
  galleryId: string;
  blockId?: string;
  value: string;
  onChange: (url: string) => void;
  shape?: "square" | "avatar" | "wide";
  uploadLabel?: string;
  urlPlaceholder?: string;
  id?: string;
  /** Hide the Gallery tab (e.g. for avatar/image fields where brand icons don't make sense) */
  hideGallery?: boolean;
}

type Tab = "gallery" | "upload" | "url";

function detectInitialTab(value: string, hideGallery: boolean): Tab {
  if (!value) return hideGallery ? "upload" : "gallery";
  if (isSimpleIconUrl(value)) return "gallery";
  if (value.startsWith("/api/gallery/assets/") || value.startsWith("data:")) return "upload";
  return "url";
}

export function ImageOrUrlInput({
  galleryId,
  blockId,
  value,
  onChange,
  shape = "square",
  uploadLabel = "Upload icon",
  urlPlaceholder = "https://...",
  id,
  hideGallery = false,
}: ImageOrUrlInputProps) {
  const [tab, setTab] = useState<Tab>(() => detectInitialTab(value, hideGallery));

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    ...(!hideGallery ? [{ id: "gallery" as Tab, icon: LayoutGrid, label: "Gallery" }] : []),
    { id: "upload" as Tab, icon: Upload, label: "Upload" },
    { id: "url" as Tab, icon: Link, label: "URL" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg w-fit">
        {tabs.map(({ id: tabId, icon: Icon, label }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
              tab === tabId
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Gallery tab ──────────────────────────────────────────────────────── */}
      {tab === "gallery" && (
        <IconGallery value={value} onChange={onChange} />
      )}

      {/* ── Upload tab ───────────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <FileUpload
          galleryId={galleryId}
          blockId={blockId}
          value={
            value.startsWith("/api/gallery/assets/") || value.startsWith("data:")
              ? value
              : ""
          }
          onChange={onChange}
          onRemove={() => onChange("")}
          shape={shape}
          label={uploadLabel}
        />
      )}

      {/* ── URL tab ──────────────────────────────────────────────────────────── */}
      {tab === "url" && (
        <div className="flex flex-col gap-2">
          <TextInput
            id={id}
            value={tab === "url" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={urlPlaceholder}
            type="url"
          />
          {value && tab === "url" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className={cn(
                "object-contain border border-stone-200",
                shape === "wide" ? "w-full h-24 rounded-xl" : "w-10 h-10 rounded-lg"
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileUploadProps {
  /** Gallery ID — required to associate the asset with the right gallery */
  galleryId: string;
  /** Block ID — optional, associates the asset with a specific block */
  blockId?: string;
  /** Current value (URL or asset path) — shown as preview */
  value?: string;
  /** Called with the new asset URL after a successful upload */
  onChange: (url: string) => void;
  /** Called when the user removes the current image */
  onRemove?: () => void;
  /** Preview shape — "square" for icons, "wide" for full images */
  shape?: "square" | "wide" | "avatar";
  /** Max file size in bytes (default: 2MB) */
  maxSize?: number;
  /** Accepted MIME types (default: image/*) */
  accept?: string;
  /** Placeholder label shown in the drop zone */
  label?: string;
  className?: string;
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── FileUpload ───────────────────────────────────────────────────────────────

export function FileUpload({
  galleryId,
  blockId,
  value,
  onChange,
  onRemove,
  shape = "wide",
  maxSize = 2 * 1024 * 1024, // 2 MB
  accept = "image/*",
  label = "Upload image",
  className,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── Upload handler ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setError(null);

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, SVG, WebP).");
      return;
    }

    // Validate size
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${formatBytes(maxSize)}.`);
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryId,
          blockId: blockId ?? null,
          file: base64,
          filename: file.name,
          mimeType: file.type,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        const msg = body.error
          ? body.detail
            ? `${body.error} — ${body.detail}`
            : body.error
          : `Upload failed (${res.status})`;
        throw new Error(msg);
      }

      const { asset } = await res.json();
      // Return a URL that serves the asset from our API
      onChange(`/api/gallery/assets/${asset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Input change ────────────────────────────────────────────────────────────

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  // ── Drag and drop ───────────────────────────────────────────────────────────

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── Remove ──────────────────────────────────────────────────────────────────

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    onRemove?.();
    onChange("");
  }

  // ── Preview dimensions ──────────────────────────────────────────────────────

  const previewClass = {
    square: "w-16 h-16 rounded-xl",
    avatar: "w-16 h-16 rounded-full",
    wide: "w-full h-32 rounded-xl",
  }[shape];

  const dropZoneClass = {
    square: "h-20 w-20",
    avatar: "h-20 w-20 rounded-full",
    wide: "h-24 w-full",
  }[shape];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Preview — shown when a value exists */}
      {value ? (
        <div className="relative inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className={cn("object-cover border border-stone-200", previewClass)}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Remove button */}
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer shadow-sm"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {/* Replace overlay on hover */}
          {!disabled && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors rounded-xl cursor-pointer opacity-0 hover:opacity-100"
              aria-label="Replace image"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      ) : (
        /* Drop zone — shown when no value */
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={disabled || uploading}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-all cursor-pointer",
            dropZoneClass,
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100",
            (disabled || uploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-5 h-5 text-stone-400" />
              {shape === "wide" && (
                <span className="text-xs text-stone-500 text-center px-2">
                  {dragOver ? "Drop to upload" : label}
                </span>
              )}
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled || uploading}
        aria-label={label}
      />

      {/* Upload progress / hint */}
      {uploading && (
        <p className="text-xs text-stone-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Uploading…
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Size hint */}
      {!value && !uploading && !error && (
        <p className="text-xs text-stone-400">
          PNG, JPG, SVG, WebP · max {formatBytes(maxSize)}
        </p>
      )}
    </div>
  );
}

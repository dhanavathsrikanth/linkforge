"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/Button";
import { useQROptions } from "./useQROptions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { downloadPNG, downloadSVG, copyPNGToClipboard } from "./qrDownload";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import {
  Download,
  Image as ImageIcon,
  Clipboard,
  Check,
  Loader2,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ECL = "L" | "M" | "Q" | "H";

const ECL_INFO: { level: ECL; label: string; desc: string }[] = [
  { level: "L", label: "L", desc: "~7% recovery — smallest QR" },
  { level: "M", label: "M", desc: "~15% recovery — recommended" },
  { level: "Q", label: "Q", desc: "~25% recovery — use with logos" },
  { level: "H", label: "H", desc: "~30% recovery — most robust" },
];

const MAX_LOGO_BYTES = 50 * 1024; // 50 KB

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  linkId: string;
  linkSlug: string;
  shortUrl: string; // e.g. https://linkforge.app/abc123
  linkTitle: string;
  initialSettings?: QRSettings;
  onSaved?: (settings: QRSettings) => void;
}

export function QRCustomizePanel({
  open,
  onOpenChange,
  linkId,
  linkSlug,
  shortUrl,
  linkTitle,
  initialSettings = DEFAULT_QR_SETTINGS,
  onSaved,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { options, debounced, setFgColor, setBgColor, setErrorLevel, setSize, setLogoUrl, setRounded, setFrameStyle } =
    useQROptions(initialSettings);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [pngLoading, setPngLoading] = useState(false);
  const [svgLoading, setSvgLoading] = useState(false);
  const [clipLoading, setClipLoading] = useState(false);
  const [clipOk, setClipOk] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // QR destination includes ?source=qr so the worker can count QR scans
  const qrTargetUrl = shortUrl.includes("?")
    ? `${shortUrl}&source=qr`
    : `${shortUrl}?source=qr`;

  // Logo upload handler
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setActionError("Logo must be under 50 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/links/${linkId}/qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      setSaveOk(true);
      onSaved?.(options);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPNG() {
    setPngLoading(true);
    setActionError(null);
    try {
      await downloadPNG(qrTargetUrl, linkSlug, debounced, linkId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setPngLoading(false);
    }
  }

  function handleDownloadSVG() {
    setSvgLoading(true);
    setActionError(null);
    try {
      const svg = svgRef.current;
      if (!svg) throw new Error("SVG not rendered");
      downloadSVG(svg, linkSlug, linkId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "SVG export failed");
    } finally {
      setSvgLoading(false);
    }
  }

  async function handleCopyClipboard() {
    setClipLoading(true);
    setClipOk(false);
    setActionError(null);
    try {
      await copyPNGToClipboard(qrTargetUrl, debounced);
      setClipOk(true);
      setTimeout(() => setClipOk(false), 2500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Clipboard failed");
    } finally {
      setClipLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="w-full sm:max-w-[480px] flex flex-col overflow-y-auto gap-0 p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>QR Code — {linkTitle || linkSlug}</SheetTitle>
          <SheetDescription className="font-mono text-xs">{shortUrl}</SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ── Live Preview ─────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3">
            {/* Phone mockup */}
            <div className="relative flex items-center justify-center rounded-[2rem] border-[3px] border-slate-300 bg-white p-4 shadow-xl shadow-slate-200/60 w-[180px] h-[280px]">
              {/* notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 h-4 w-16 rounded-full bg-slate-200" />
              <div
                className={cn(
                  "relative flex flex-col items-center gap-2",
                  debounced.frameStyle === "scan-me" && "mt-4"
                )}
              >
                <QRCodeSVG
                  ref={svgRef as React.Ref<SVGSVGElement>}
                  value={qrTargetUrl}
                  size={120}
                  fgColor={debounced.fgColor}
                  bgColor={debounced.bgColor === "transparent" ? "transparent" : debounced.bgColor}
                  level={debounced.errorLevel}
                  imageSettings={
                    debounced.logoUrl
                      ? {
                          src: debounced.logoUrl,
                          height: 24,
                          width: 24,
                          excavate: true,
                        }
                      : undefined
                  }
                />
                {debounced.frameStyle === "scan-me" && (
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
                    SCAN ME
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Smartphone className="h-3 w-3" />
              <span>Live preview</span>
            </div>
          </div>

          {/* ── Foreground Colour ─────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Foreground colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={options.fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
              <code className="text-xs text-muted-foreground">{options.fgColor}</code>
            </div>
          </div>

          {/* ── Background Colour ─────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Background colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={options.bgColor === "transparent" ? "#ffffff" : options.bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
              />
              <button
                type="button"
                onClick={() =>
                  setBgColor(options.bgColor === "transparent" ? "#ffffff" : "transparent")
                }
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  options.bgColor === "transparent"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                Transparent
              </button>
              {options.bgColor !== "transparent" && (
                <code className="text-xs text-muted-foreground">{options.bgColor}</code>
              )}
            </div>
          </div>

          {/* ── Error Correction ──────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Error correction level</label>
            <div className="grid grid-cols-4 gap-2">
              {ECL_INFO.map(({ level, label, desc }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setErrorLevel(level)}
                  title={desc}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-bold transition-colors",
                    options.errorLevel === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {ECL_INFO.find((e) => e.level === options.errorLevel)?.desc}
            </p>
          </div>

          {/* ── Size ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Size</label>
              <code className="text-xs text-muted-foreground">{options.size}px</code>
            </div>
            <input
              type="range"
              min={128}
              max={1024}
              step={64}
              value={options.size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>128px</span>
              <span>1024px</span>
            </div>
          </div>

          {/* ── Logo ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Center logo</label>
            <p className="text-[11px] text-muted-foreground">
              Max 50 KB. Stored inline — no cloud upload needed.
              Use error level Q or H when adding a logo.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <ImageIcon className="h-4 w-4" />
                {options.logoUrl ? "Change logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={handleLogoUpload}
                />
              </label>
              {options.logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(undefined)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            {options.logoUrl && (
              <img
                src={options.logoUrl}
                alt="Logo preview"
                className="mt-1 h-10 w-10 rounded-md object-contain border border-border"
              />
            )}
          </div>

          {/* ── Rounded corners ───────────────────────────────── */}
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Rounded corners</p>
              <p className="text-[11px] text-muted-foreground">Softer aesthetic QR style</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={options.rounded}
              onClick={() => setRounded(!options.rounded)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                options.rounded ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  options.rounded ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* ── Frame style ───────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Frame</label>
            <div className="grid grid-cols-2 gap-2">
              {(["none", "scan-me"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setFrameStyle(style)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors",
                    options.frameStyle === style
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {style === "none" ? "No frame" : '"SCAN ME" label'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Action error ──────────────────────────────────── */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {actionError}
            </div>
          )}

          {/* ── Download actions ──────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Download</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPNG}
                disabled={pngLoading}
                className="gap-1.5 text-xs"
              >
                {pngLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSVG}
                disabled={svgLoading}
                className="gap-1.5 text-xs"
              >
                {svgLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyClipboard}
                disabled={clipLoading}
                className="gap-1.5 text-xs"
              >
                {clipLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : clipOk ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Clipboard className="h-3.5 w-3.5" />
                )}
                {clipOk ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Footer: Save ─────────────────────────────────────── */}
        <SheetFooter className="px-6 pb-6 pt-4 border-t border-border shrink-0 gap-2">
          {saveError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {saveError}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveOk ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saving ? "Saving…" : saveOk ? "Saved!" : "Save QR settings"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

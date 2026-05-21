"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
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
  Palette,
  Layers,
  ZoomIn,
  Scan,
  Frame,
  SlidersHorizontal,
  PaintBucket,
  FlipHorizontal,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ECL = "L" | "M" | "Q" | "H";

const ECL_INFO: { level: ECL; label: string; desc: string }[] = [
  { level: "L", label: "L", desc: "~7% recovery" },
  { level: "M", label: "M", desc: "~15% recovery" },
  { level: "Q", label: "Q", desc: "~25% recovery" },
  { level: "H", label: "H", desc: "~30% recovery" },
];

const LOGO_SIZES = [
  { value: "small" as const, label: "Small", px: 16 },
  { value: "medium" as const, label: "Medium", px: 24 },
  { value: "large" as const, label: "Large", px: 32 },
];

const MAX_LOGO_BYTES = 50 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  linkId: string;
  linkSlug: string;
  shortUrl: string;
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

  const {
    options, debounced,
    setFgColor, setBgColor, setErrorLevel, setSize,
    setLogoUrl, setLogoOpacity, setLogoSize,
    setRounded, setFrameStyle, setFrameText,
    setMarginSize, setBoostLevel, setMinVersion,
  } = useQROptions(initialSettings);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [pngLoading, setPngLoading] = useState(false);
  const [svgLoading, setSvgLoading] = useState(false);
  const [clipLoading, setClipLoading] = useState(false);
  const [clipOk, setClipOk] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const qrTargetUrl = shortUrl.includes("?")
    ? `${shortUrl}&source=qr`
    : `${shortUrl}?source=qr`;

  const logoPx = LOGO_SIZES.find((s) => s.value === options.logoSize)?.px ?? 24;

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setActionError("Logo must be under 50 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          isMobile && "!left-0 !top-0 !translate-x-0 !translate-y-0 max-w-full h-full max-h-full rounded-none border-0"
        )}
        showCloseButton
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 ring-1 ring-primary/10">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">
                {linkTitle || linkSlug}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs mt-0.5 truncate">
                {shortUrl}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4 space-y-5 max-h-[65vh]">
          {/* ── Preview Row ── */}
          <div className="flex items-start gap-5 p-4 rounded-xl bg-gradient-to-br from-muted/80 to-muted/30 border border-border/50">
            <div className="relative flex items-center justify-center rounded-xl border-2 border-border bg-white p-3 shadow-sm shrink-0 w-[120px] h-[120px]">
              <QRCodeSVG
                ref={svgRef as React.Ref<SVGSVGElement>}
                value={qrTargetUrl}
                size={90}
                fgColor={debounced.fgColor}
                bgColor={debounced.bgColor === "transparent" ? "transparent" : debounced.bgColor}
                level={debounced.errorLevel}
                marginSize={debounced.marginSize}
                boostLevel={debounced.boostLevel}
                minVersion={debounced.minVersion}
                imageSettings={
                  debounced.logoUrl
                    ? {
                        src: debounced.logoUrl,
                        height: logoPx,
                        width: logoPx,
                        excavate: true,
                        opacity: debounced.logoOpacity,
                      }
                    : undefined
                }
              />
              {debounced.frameStyle === "scan-me" && (
                <span className="absolute -bottom-2 text-[7px] font-bold tracking-widest uppercase whitespace-nowrap" style={{ color: debounced.fgColor }}>
                  {debounced.frameText || "SCAN ME"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground/70 uppercase tracking-wider flex items-center gap-1">
                    <ZoomIn className="h-3 w-3" />
                    Size
                  </p>
                  <code className="text-xs font-medium text-foreground/60">{options.size}px</code>
                </div>
                <input type="range" min={128} max={1024} step={64} value={options.size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-primary h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>128px</span>
                  <span>1024px</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleDownloadPNG} disabled={pngLoading} className="gap-1 text-xs h-7 flex-1">
                  {pngLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadSVG} disabled={svgLoading} className="gap-1 text-xs h-7 flex-1">
                  {svgLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  SVG
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyClipboard} disabled={clipLoading} className="gap-1 text-xs h-7 flex-1">
                  {clipLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : clipOk ? <Check className="h-3 w-3 text-emerald-500" /> : <Clipboard className="h-3 w-3" />}
                  {clipOk ? "Done" : "Copy"}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Colors ── */}
          <div>
            <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
              <Palette className="h-3 w-3" />
              Colors
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Foreground</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={options.fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5" />
                  <code className="text-[10px] text-muted-foreground font-mono">{options.fgColor}</code>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Background</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={options.bgColor === "transparent" ? "#ffffff" : options.bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5" />
                  <button type="button"
                    onClick={() => setBgColor(options.bgColor === "transparent" ? "#ffffff" : "transparent")}
                    className={cn("rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors",
                      options.bgColor === "transparent"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80")}>
                    Alpha
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Layout ── */}
          <div>
            <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
              <SlidersHorizontal className="h-3 w-3" />
              Layout
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Margin</label>
                  <code className="text-[10px] text-muted-foreground">{options.marginSize ?? 0}</code>
                </div>
                <input type="range" min={0} max={8} step={1} value={options.marginSize ?? 0}
                  onChange={(e) => setMarginSize(Number(e.target.value))}
                  className="w-full accent-primary h-1.5" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <p className="text-xs font-medium">Smart ECL</p>
                <button type="button" role="switch" aria-checked={options.boostLevel ?? true}
                  onClick={() => setBoostLevel(!(options.boostLevel ?? true))}
                  className={cn("relative h-5 w-9 rounded-full transition-colors shrink-0",
                    (options.boostLevel ?? true) ? "bg-primary" : "bg-muted-foreground/25")}>
                  <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    (options.boostLevel ?? true) ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <p className="text-xs font-medium">Rounded</p>
                <button type="button" role="switch" aria-checked={options.rounded}
                  onClick={() => setRounded(!options.rounded)}
                  className={cn("relative h-5 w-9 rounded-full transition-colors shrink-0",
                    options.rounded ? "bg-primary" : "bg-muted-foreground/25")}>
                  <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    options.rounded ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Version</label>
                  <code className="text-[10px] text-muted-foreground">v{options.minVersion ?? 1}</code>
                </div>
                <input type="range" min={1} max={40} step={1} value={options.minVersion ?? 1}
                  onChange={(e) => setMinVersion(Number(e.target.value))}
                  className="w-full accent-primary h-1.5" />
              </div>
            </div>
          </div>

          {/* ── Error Correction + Frame ── */}
          <div>
            <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
              <Scan className="h-3 w-3" />
              Error Correction &amp; Frame
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1">
                  {ECL_INFO.map(({ level, label }) => (
                    <button key={level} type="button" onClick={() => setErrorLevel(level)}
                      className={cn("rounded-md border py-1 text-[11px] font-bold transition-colors",
                        options.errorLevel === level
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1">
                  {(["none", "scan-me"] as const).map((style) => (
                    <button key={style} type="button" onClick={() => setFrameStyle(style)}
                      className={cn("rounded-md border py-1 text-[11px] font-medium transition-colors",
                        options.frameStyle === style
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40")}>
                      {style === "none" ? "None" : "Label"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {options.frameStyle === "scan-me" && (
              <div className="mt-2 flex items-center gap-2">
                <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                <input type="text" value={options.frameText ?? ""}
                  onChange={(e) => setFrameText(e.target.value || undefined)}
                  placeholder="SCAN ME"
                  className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
            )}
          </div>

          {/* ── Logo Section ── */}
          <div>
            <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
              <ImageIcon className="h-3 w-3" />
              Logo
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                {options.logoUrl && (
                  <img src={options.logoUrl} alt="" className="h-8 w-8 rounded object-contain border border-border shrink-0" />
                )}
                <label className="flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {options.logoUrl ? "Change" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={handleLogoUpload} />
                </label>
                {options.logoUrl && (
                  <button type="button" onClick={() => setLogoUrl(undefined)} className="text-xs text-destructive hover:underline shrink-0">
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {LOGO_SIZES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setLogoSize(value)}
                    className={cn("rounded-md border px-2 py-1 text-[10px] font-medium transition-colors flex-1",
                      options.logoSize === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40")}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <p className="text-xs text-muted-foreground shrink-0">Opacity</p>
                <input type="range" min={0.1} max={1} step={0.1} value={options.logoOpacity ?? 1}
                  onChange={(e) => setLogoOpacity(Number(e.target.value))}
                  className="w-full accent-primary h-1.5" />
                <code className="text-[10px] text-muted-foreground w-8 text-right">{Math.round((options.logoOpacity ?? 1) * 100)}%</code>
              </div>
            </div>
          </div>

          {/* Action error */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {actionError}
            </div>
          )}
        </div>

        <DialogFooter>
          {saveError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {saveError}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 h-9 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveOk ? <Check className="h-4 w-4" /> : null}
            {saving ? "Saving\u2026" : saveOk ? "Saved!" : "Save QR settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

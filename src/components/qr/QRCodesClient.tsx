"use client";

import { Suspense, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Sparkles, Download, QrCode, Settings2, ChevronDown, ChevronUp, ImageIcon, Palette, Scan, Type, SlidersHorizontal } from "lucide-react";
import { usePostHog } from "@posthog/react";
import { useSearchParams } from "next/navigation";
import { QRCard } from "./QRCard";
import { downloadPNG } from "./qrDownload";
import { useQROptions } from "./useQROptions";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn, getShortLinkBase } from "@/lib/utils";

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  totalClicks: number;
  qrSettings?: QRSettings | null;
};

interface Props {
  links: LinkRow[];
  defaultDomain?: string;
}

export function QRCodesClient({ links, defaultDomain = getShortLinkBase() }: Props) {
  return (
    <Suspense fallback={null}>
      <QRCodesClientInner links={links} defaultDomain={defaultDomain} />
    </Suspense>
  );
}

const ECL_INFO: { level: "L" | "M" | "Q" | "H"; label: string }[] = [
  { level: "L", label: "L" },
  { level: "M", label: "M" },
  { level: "Q", label: "Q" },
  { level: "H", label: "H" },
];

const LOGO_SIZES = [
  { value: "small" as const, label: "Small" },
  { value: "medium" as const, label: "Medium" },
  { value: "large" as const, label: "Large" },
];

const MAX_LOGO_BYTES = 50 * 1024;

function QRCodesClientInner({ links, defaultDomain }: Props) {
  const posthog = usePostHog();
  const [standaloneUrl, setStandaloneUrl] = useState("");
  const [standaloneValid, setStandaloneValid] = useState(false);
  const [standaloneDownloading, setStandaloneDownloading] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [logoActionError, setLogoActionError] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const {
    options: customOptions, debounced: customDebounced,
    setFgColor, setBgColor, setErrorLevel, setSize,
    setLogoUrl, setLogoOpacity, setLogoSize,
    setRounded, setFrameStyle, setFrameText,
    setMarginSize, setBoostLevel, setMinVersion,
    reset,
  } = useQROptions(DEFAULT_QR_SETTINGS);

  const searchParams = useSearchParams();
  const focusLinkId = searchParams?.get("focus") ?? null;
  const focusedLink = focusLinkId
    ? links.find((l) => l.id === focusLinkId) ?? null
    : null;
  const [forcedFocus, setForcedFocus] = useState<string | null>(focusLinkId);

  useEffect(() => {
    if (focusLinkId) setForcedFocus(focusLinkId);
  }, [focusLinkId]);

  function handleStandaloneChange(v: string) {
    setStandaloneUrl(v);
    try {
      new URL(v);
      setStandaloneValid(true);
    } catch {
      setStandaloneValid(false);
    }
  }

  async function handleStandaloneDownload() {
    if (!standaloneValid) return;
    setStandaloneDownloading(true);
    try {
      const slug = encodeURIComponent(new URL(standaloneUrl).hostname);
      await downloadPNG(standaloneUrl, slug, customDebounced, undefined, posthog);
    } catch {
      // silent
    } finally {
      setStandaloneDownloading(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setLogoActionError("Logo must be under 50 KB");
      e.target.value = "";
      return;
    }
    setLogoActionError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  const logoPx =
    customOptions.logoSize === "small" ? 20 : customOptions.logoSize === "large" ? 36 : 28;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page header */}
      <div className="text-center sm:text-left">
        <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
          QR Codes
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
          QR Code Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Every short link gets a QR code. Customise colours, logos, and frames — then download in PNG or SVG.
        </p>
      </div>

      {/* Quick QR Generator */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <QrCode className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Quick QR Generator</h2>
            <p className="text-xs text-muted-foreground">Paste any URL to generate a QR code instantly — no link creation needed.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              placeholder="https://example.com"
              value={standaloneUrl}
              onChange={(e) => handleStandaloneChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!standaloneValid || standaloneDownloading}
              onClick={handleStandaloneDownload}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
            <button
              type="button"
              disabled={!standaloneValid}
              onClick={() => setShowCustomize(!showCustomize)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
                showCustomize
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{showCustomize ? "Hide" : "Customize"}</span>
              {showCustomize ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {standaloneValid && standaloneUrl && (
          <div className={cn(
            "space-y-5",
            isMobile ? "flex flex-col items-center text-center" : ""
          )}>
            <div className={cn(
              "flex gap-6",
              isMobile ? "flex-col items-center" : showCustomize ? "flex-col" : "items-start"
            )}>
              <div className={cn(
                "rounded-xl border border-border bg-white p-3 shadow-sm shrink-0",
                customOptions.rounded ? "rounded-3xl" : "rounded-xl"
              )}>
                <QRCodeSVG
                  value={standaloneUrl}
                  size={isMobile ? 160 : showCustomize ? 140 : 120}
                  fgColor={customDebounced.fgColor}
                  bgColor={customDebounced.bgColor === "transparent" ? "transparent" : customDebounced.bgColor}
                  level={customDebounced.errorLevel}
                  marginSize={customDebounced.marginSize}
                  boostLevel={customDebounced.boostLevel}
                  minVersion={customDebounced.minVersion}
                  imageSettings={
                    customDebounced.logoUrl
                      ? {
                          src: customDebounced.logoUrl,
                          height: logoPx,
                          width: logoPx,
                          excavate: true,
                          opacity: customDebounced.logoOpacity ?? 1,
                        }
                      : undefined
                  }
                />
                {customDebounced.frameStyle === "scan-me" && (
                  <p
                    className="mt-1 text-center text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: customDebounced.fgColor }}
                  >
                    {customDebounced.frameText || "SCAN ME"}
                  </p>
                )}
              </div>
              <div className={cn(
                "flex flex-col gap-1 pt-1",
                isMobile ? "items-center" : "",
                showCustomize ? "hidden" : ""
              )}>
                <p className="text-xs font-medium text-foreground">Live preview</p>
                <p className="text-[11px] text-muted-foreground break-all max-w-xs">{standaloneUrl}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  This QR code will not be linked to any analytics.{" "}
                  <Link href="/dashboard/links" className="text-primary hover:underline font-medium">
                    Create a short link
                  </Link>{" "}
                  to track scans.
                </p>
              </div>
            </div>

            {/* Customization Controls */}
            {showCustomize && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-5">
                {/* Colors */}
                <div>
                  <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
                    <Palette className="h-3 w-3" />
                    Colors
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Foreground</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={customOptions.fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5" />
                        <code className="text-[10px] text-muted-foreground font-mono">{customOptions.fgColor}</code>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Background</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={customOptions.bgColor === "transparent" ? "#ffffff" : customOptions.bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5" />
                        <button type="button"
                          onClick={() => setBgColor(customOptions.bgColor === "transparent" ? "#ffffff" : "transparent")}
                          className={cn("rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors whitespace-nowrap",
                            customOptions.bgColor === "transparent"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-border/80")}>
                          Alpha
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
                    <ImageIcon className="h-3 w-3" />
                    Logo
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {customOptions.logoUrl && (
                      <img src={customOptions.logoUrl} alt="" className="h-8 w-8 rounded object-contain border border-border shrink-0" />
                    )}
                    <label className="flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {customOptions.logoUrl ? "Change" : "Upload"}
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={handleLogoUpload} />
                    </label>
                    {customOptions.logoUrl && (
                      <button type="button" onClick={() => { setLogoUrl(undefined); }} className="text-xs text-destructive hover:underline shrink-0">
                        Remove
                      </button>
                    )}
                    {LOGO_SIZES.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => setLogoSize(value)}
                        className={cn("rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                          customOptions.logoSize === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40")}>
                        {label}
                      </button>
                    ))}
                    {customOptions.logoUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Opacity</span>
                        <input type="range" min={0.1} max={1} step={0.1} value={customOptions.logoOpacity ?? 1}
                          onChange={(e) => setLogoOpacity(Number(e.target.value))}
                          className="w-20 accent-primary h-1.5" />
                        <code className="text-[10px] text-muted-foreground w-8">{Math.round((customOptions.logoOpacity ?? 1) * 100)}%</code>
                      </div>
                    )}
                  </div>
                  {logoActionError && (
                    <p className="mt-1 text-xs text-destructive">{logoActionError}</p>
                  )}
                </div>

                {/* Error Correction + Frame */}
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
                              customOptions.errorLevel === level
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
                              customOptions.frameStyle === style
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40")}>
                            {style === "none" ? "None" : "Label"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {customOptions.frameStyle === "scan-me" && (
                    <div className="mt-2 flex items-center gap-2">
                      <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                      <input type="text" value={customOptions.frameText ?? ""}
                        onChange={(e) => setFrameText(e.target.value || undefined)}
                        placeholder="SCAN ME"
                        className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                  )}
                </div>

                {/* Layout */}
                <div>
                  <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1 mb-3">
                    <SlidersHorizontal className="h-3 w-3" />
                    Layout
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Margin</label>
                        <code className="text-[10px] text-muted-foreground">{customOptions.marginSize ?? 0}</code>
                      </div>
                      <input type="range" min={0} max={8} step={1} value={customOptions.marginSize ?? 0}
                        onChange={(e) => setMarginSize(Number(e.target.value))}
                        className="w-full accent-primary h-1.5" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <p className="text-xs font-medium">Rounded</p>
                      <button type="button" role="switch" aria-checked={customOptions.rounded}
                        onClick={() => setRounded(!customOptions.rounded)}
                        className={cn("relative h-5 w-9 rounded-full transition-colors shrink-0",
                          customOptions.rounded ? "bg-primary" : "bg-muted-foreground/25")}>
                        <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                          customOptions.rounded ? "translate-x-4" : "translate-x-0")} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Version</label>
                        <code className="text-[10px] text-muted-foreground">v{customOptions.minVersion ?? 1}</code>
                      </div>
                      <input type="range" min={1} max={40} step={1} value={customOptions.minVersion ?? 1}
                        onChange={(e) => setMinVersion(Number(e.target.value))}
                        className="w-full accent-primary h-1.5" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <p className="text-xs font-medium">Size</p>
                      <code className="text-[10px] text-muted-foreground">{customOptions.size}px</code>
                    </div>
                  </div>
                </div>

                {/* Reset */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset to defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* QR cards */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Your Links
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {links.length}
            </span>
          </h2>
        </div>

        {focusedLink && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Editing QR for</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {defaultDomain}/{focusedLink.slug}
              </p>
            </div>
            <Link
              href="/dashboard/qr"
              className="text-xs font-medium text-primary hover:underline"
            >
              Done
            </Link>
          </div>
        )}

        {links.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold">No links yet</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Create your first short link to automatically get a customizable QR code.
            </p>
            <Link
              href="/dashboard/links"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Create your first link
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {links.map((link) => (
              <QRCard
                key={link.id}
                link={link}
                defaultDomain={defaultDomain}
                autoOpenCustomize={forcedFocus === link.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

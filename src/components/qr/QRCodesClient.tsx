"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Link2, Sparkles, Download, QrCode, Settings2,
  ImageIcon, Palette, Scan, Type, SlidersHorizontal, Loader2, Check,
} from "lucide-react";
import { usePostHog } from "@posthog/react";
import { useSearchParams } from "next/navigation";
import { QRCard } from "./QRCard";
import { downloadPNG } from "./qrDownload";
import { useQROptions } from "./useQROptions";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn, getShortLinkBase, getQrDomain } from "@/lib/utils";

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  totalClicks: number;
  qrSettings?: QRSettings | null;
  domain?: { domain: string } | null;
};

interface Props {
  links: LinkRow[];
  defaultDomain?: string;
  workspaceId?: string;
}

export function QRCodesClient({ links, defaultDomain = getShortLinkBase(), workspaceId }: Props) {
  return (
    <Suspense fallback={null}>
      <QRCodesClientInner links={links} defaultDomain={defaultDomain} workspaceId={workspaceId} />
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

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function QRCodesClientInner({ links, defaultDomain, workspaceId }: Props) {
  const posthog = usePostHog();
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Creation state
  const [destinationUrl, setDestinationUrl] = useState("");
  const [destinationValid, setDestinationValid] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkRow | null>(null);
  const [localLinks, setLocalLinks] = useState<LinkRow[]>([]);
  const [showCustomize, setShowCustomize] = useState(false);

  // QR customization
  const {
    options: customOptions, debounced: customDebounced,
    setFgColor, setBgColor, setErrorLevel,
    setLogoUrl, setLogoOpacity, setLogoSize,
    setRounded, setFrameStyle, setFrameText,
    setMarginSize, setBoostLevel, setMinVersion,
    reset: resetOptions,
  } = useQROptions(DEFAULT_QR_SETTINGS);

  const [logoActionError, setLogoActionError] = useState<string | null>(null);

  // Focus state from query param
  const searchParams = useSearchParams();
  const focusLinkId = searchParams?.get("focus") ?? null;
  const focusedLink = focusLinkId
    ? links.find((l) => l.id === focusLinkId) ?? null
    : null;
  const [forcedFocus, setForcedFocus] = useState<string | null>(focusLinkId);

  useEffect(() => {
    if (focusLinkId) setForcedFocus(focusLinkId);
  }, [focusLinkId]);

  // Auto-generate slug from URL hostname
  useEffect(() => {
    if (!slugManuallyEdited && destinationValid) {
      try {
        const host = new URL(destinationUrl).hostname
          .replace(/^www\./, "")
          .replace(/[^a-zA-Z0-9]/g, "-")
          .toLowerCase()
          .slice(0, 24);
        setSlug(host || generateSlug());
      } catch {
        setSlug(generateSlug());
      }
    }
  }, [destinationUrl, destinationValid, slugManuallyEdited]);

  function handleUrlChange(v: string) {
    setDestinationUrl(v);
    setCreatedLink(null);
    try {
      new URL(v);
      setDestinationValid(true);
    } catch {
      setDestinationValid(false);
    }
  }

  const handleCreate = useCallback(async () => {
    if (!destinationValid || !workspaceId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const finalSlug = slug.trim() || generateSlug();
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destinationUrl,
          slug: finalSlug,
          workspaceId,
          qrSettings: customOptions,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        const msg = err.error?.message || err.error?.code || "Failed to create QR code";
        if (err.error?.code === "SLUG_TAKEN" || err.error?.code === "SLUG_TAKEN_ON_DOMAIN") {
          setSlug(generateSlug());
          setSlugManuallyEdited(false);
        }
        throw new Error(msg);
      }
      const data = await res.json();
      const newLink: LinkRow = {
        id: data.link?.id ?? data.id,
        slug: data.shortSlug ?? finalSlug,
        destination: destinationUrl,
        title: null,
        totalClicks: 0,
        qrSettings: data.qrSettings ?? DEFAULT_QR_SETTINGS,
        domain: null,
      };
      setLocalLinks((prev) => [newLink, ...prev]);
      setCreatedLink(newLink);
      setDestinationUrl("");
      setSlug("");
      setSlugManuallyEdited(false);
      setShowCustomize(false);
      resetOptions();
      posthog?.capture?.("qr_code_created", { linkId: newLink.id });
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }, [destinationUrl, destinationValid, slug, workspaceId, customOptions, posthog, resetOptions]);

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

  const allLinks = [...localLinks, ...links];

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
          Enter a URL, customise the look, and create a trackable QR code in one step.
        </p>
      </div>

      {/* Create QR Code section */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <QrCode className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Create QR Code</h2>
            <p className="text-xs text-muted-foreground">
              Generates a short link and a downloadable QR code — scans are tracked automatically.
            </p>
          </div>
        </div>

        {createdLink ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Check className="h-5 w-5" />
              <p className="text-sm font-semibold">QR code created!</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="rounded-xl border border-border bg-white p-2 shrink-0">
                <QRCodeSVG
                  value={`https://${getQrDomain()}/s/${createdLink.slug}?source=qr`}
                  size={80}
                  fgColor={createdLink.qrSettings?.fgColor ?? "#000000"}
                  bgColor={(createdLink.qrSettings?.bgColor ?? "#ffffff") === "transparent" ? "transparent" : (createdLink.qrSettings?.bgColor ?? "#ffffff")}
                  level={createdLink.qrSettings?.errorLevel ?? "M"}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Short URL: <code className="font-mono font-medium text-foreground">{defaultDomain}/{createdLink.slug}</code>
                </p>
                <p className="text-xs text-muted-foreground truncate" title={createdLink.destination}>
                  → {createdLink.destination}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const url = `https://${getQrDomain()}/s/${createdLink.slug}?source=qr`;
                    const settings = createdLink.qrSettings ?? DEFAULT_QR_SETTINGS;
                    await downloadPNG(url, createdLink.slug, settings, createdLink.id, posthog);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PNG
                </button>
                <Link
                  href={`/dashboard/qr?focus=${createdLink.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Customise
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setCreatedLink(null); setShowCustomize(false); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Create another
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* URL + Slug inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Destination URL</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={destinationUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Short link slug
                  <button
                    type="button"
                    onClick={() => { setSlug(generateSlug()); setSlugManuallyEdited(true); }}
                    className="ml-1.5 text-primary hover:underline text-[10px] font-normal"
                    title="Randomise slug"
                  >
                    (random)
                  </button>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
                    /s/
                  </span>
                  <input
                    type="text"
                    placeholder={generateSlug()}
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }}
                    className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 font-mono"
                    maxLength={64}
                  />
                </div>
              </div>
            </div>

            {/* QR Preview + Customize toggle */}
            {destinationValid && destinationUrl && (
              <div className={cn("space-y-4", isMobile ? "flex flex-col items-center" : "")}>
                <div className={cn("flex gap-6", isMobile ? "flex-col items-center" : "items-start")}>
                  <div className={cn(
                    "rounded-xl border border-border bg-white p-3 shadow-sm shrink-0",
                    customOptions.rounded ? "rounded-3xl" : "rounded-xl"
                  )}>
                    <QRCodeSVG
                      value={destinationUrl}
                      size={isMobile ? 160 : showCustomize ? 120 : 140}
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
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCustomize(!showCustomize)}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
                        showCustomize
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      <Palette className="h-3.5 w-3.5" />
                      {showCustomize ? "Hide options" : "Customise colours & logo"}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      Trackable — scans will appear in your link analytics.
                    </p>
                  </div>
                </div>

                {createError && (
                  <p className="text-xs text-destructive">{createError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!destinationValid || creating}
                    onClick={handleCreate}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4" />
                        Create QR Code
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!destinationValid}
                    onClick={async () => {
                      const url = destinationUrl;
                      const slug2 = encodeURIComponent(new URL(url).hostname);
                      await downloadPNG(url, slug2, customDebounced, undefined, posthog);
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Preview PNG
                  </button>
                </div>

                {/* Customization panel */}
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
                      </div>
                    </div>

                    {/* Reset */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => resetOptions()}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* QR cards */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Your QR Codes
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {allLinks.length}
            </span>
          </h2>
        </div>

        {focusedLink && !forcedFocus && (
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

        {allLinks.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold">No QR codes yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Enter a URL above, customise the look, and click Create QR Code to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {allLinks.map((link) => (
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

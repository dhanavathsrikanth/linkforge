"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Sparkles, Download, QrCode } from "lucide-react";
import { QRCard } from "./QRCard";
import { downloadPNG } from "./qrDownload";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

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
import { getShortLinkBase } from "@/lib/utils";

export function QRCodesClient({ links, defaultDomain = getShortLinkBase() }: Props) {
  const [standaloneUrl, setStandaloneUrl] = useState("");
  const [standaloneValid, setStandaloneValid] = useState(false);
  const [standaloneDownloading, setStandaloneDownloading] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

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
      await downloadPNG(standaloneUrl, slug, DEFAULT_QR_SETTINGS);
    } catch {
      // silent
    } finally {
      setStandaloneDownloading(false);
    }
  }

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
          Every short link gets a QR code. Customize colours, logos, and frames — then download in PNG or SVG.
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
          <button
            type="button"
            disabled={!standaloneValid || standaloneDownloading}
            onClick={handleStandaloneDownload}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
        </div>

        {standaloneValid && standaloneUrl && (
          <div className={cn(
            "flex gap-6 pt-2",
            isMobile ? "flex-col items-center text-center" : "items-start"
          )}>
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm shrink-0">
              <QRCodeSVG value={standaloneUrl} size={isMobile ? 160 : 120} level="M" marginSize={2} />
            </div>
            <div className={cn(
              "flex flex-col gap-1 pt-1",
              isMobile ? "items-center" : ""
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
              <QRCard key={link.id} link={link} defaultDomain={defaultDomain} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

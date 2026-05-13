"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Sparkles, Download, QrCode } from "lucide-react";
import { QRCard } from "./QRCard";
import { downloadPNG } from "./qrDownload";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import Link from "next/link";

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

export function QRCodesClient({ links, defaultDomain = "linkforge.app" }: Props) {
  const [standaloneUrl, setStandaloneUrl] = useState("");
  const [standaloneValid, setStandaloneValid] = useState(false);
  const [standaloneDownloading, setStandaloneDownloading] = useState(false);

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
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
          QR Codes
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">QR Code Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every short link gets a QR code. Customize colours, logos, and frames — then download in PNG or SVG.
        </p>
      </div>

      {/* ── Standalone generator ──────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
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
          <div className="flex items-start gap-6 pt-2">
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
              <QRCodeSVG value={standaloneUrl} size={120} level="M" />
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <p className="text-xs font-medium text-foreground">Live preview</p>
              <p className="text-[11px] text-muted-foreground break-all max-w-xs">{standaloneUrl}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                This QR code will not be linked to any analytics. <br />
                <Link href="/dashboard/links" className="text-primary hover:underline">
                  Create a short link
                </Link>{" "}
                to track scans.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── QR cards grid ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Your Links
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {links.length}
            </span>
          </h2>
        </div>

        {links.length === 0 ? (
          /* Empty state */
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {links.map((link) => (
              <QRCard key={link.id} link={link} defaultDomain={defaultDomain} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ExternalLink,
  ArrowLeft,
  Globe2,
  Server,
  Calendar,
  ImageOff,
  Loader2,
} from "lucide-react";
import { TrustBadge, type TrustBand } from "@/components/safety/TrustBadge";

interface Props {
  slug: string;
  destination: string;
  destinationHost: string;
  title: string | null;
  trustScore: number | null;
  trustBand: TrustBand;
  screenshotUrl: string | null;
  categories: string[];
  technologies: string[];
  country: string | null;
  asnName: string | null;
  scannedAt: Date | string | null;
}

/**
 * Visitor preview page (Req 13). Workspace-opt-in destination preview that
 * lets a visitor inspect where a short link goes before clicking through.
 *
 * Tracking-light: no third-party scripts; only LinkForge's own click
 * tracking will fire when "Continue to destination" is clicked (the user
 * is redirected through `/s/[slug]` which captures the click normally).
 */
export function VisitorPreview({
  slug,
  destination,
  destinationHost,
  title,
  trustScore,
  trustBand,
  screenshotUrl,
  categories,
  technologies,
  country,
  asnName,
  scannedAt,
}: Props) {
  const [continuing, setContinuing] = useState(false);

  function handleContinue() {
    if (continuing) return;
    setContinuing(true);
    window.location.href = `/s/${slug}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
        {/* Header band */}
        <div className="px-6 py-4 border-b border-border bg-stone-50/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Link preview
            </p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight text-foreground truncate">
              {title || destinationHost}
            </h1>
          </div>
          <TrustBadge score={trustScore} band={trustBand} size="lg" />
        </div>

        {/* Screenshot */}
        <div className="bg-stone-900/5 border-b border-border">
          {screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={screenshotUrl}
              alt={`Screenshot of ${destinationHost}`}
              className="w-full max-h-[420px] object-cover object-top"
              loading="eager"
            />
          ) : (
            <div className="aspect-[16/9] flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ImageOff className="h-8 w-8 opacity-40" />
              <p className="text-xs">Preview not available</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Destination */}
          <div className="rounded-xl border border-border bg-stone-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Destination
            </p>
            <p className="mt-1 font-mono text-sm text-foreground break-all">
              {destination}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Host: <span className="font-mono">{destinationHost}</span>
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {country && (
              <Meta icon={Globe2} label="Country" value={country} />
            )}
            {asnName && <Meta icon={Server} label="Hosted by" value={asnName} />}
            {scannedAt && (
              <Meta
                icon={Calendar}
                label="Last checked"
                value={new Date(scannedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
            )}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Categories
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tech stack */}
          {technologies.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Built with
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {technologies.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-background"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </a>
            <button
              type="button"
              onClick={handleContinue}
              disabled={continuing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 cursor-pointer disabled:opacity-60"
            >
              {continuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Continue to destination
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Safety verdict powered by Cloudflare URL Scanner
          </p>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <span className="flex items-center gap-1 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className="block mt-0.5 text-foreground truncate">{value}</span>
    </div>
  );
}

"use client";

import {
  Globe,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Link2,
  Link2Off,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { BioDomain } from "@/components/bio/BioEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarSettingsProps {
  slug: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
  showBranding: boolean;
  domains: BioDomain[];
  customDomainId: string | null;
  onUpdate: (patch: {
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
    showBranding?: boolean;
    customDomainId?: string | null;
  }) => void;
  onPublishToggle: () => Promise<void>;
  isPublishing: boolean;
}

// ─── Domain status badge ──────────────────────────────────────────────────────

function DomainStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const isActive = status === "active" || status === "active_redeploying";
  const isPending =
    status.startsWith("pending") ||
    status.startsWith("test") ||
    status === "initializing";

  if (isActive) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Active
      </span>
    );
  }
  if (isPending) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
        <Clock className="w-2.5 h-2.5" />
        Pending
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-1.5 py-0.5">
      {status}
    </span>
  );
}

// ─── Domain picker dropdown ───────────────────────────────────────────────────

function DomainPicker({
  domains,
  value,
  onChange,
}: {
  domains: BioDomain[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = domains.find((d) => d.id === value) ?? null;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer",
          open
            ? "border-primary/50 ring-2 ring-primary/20 bg-white"
            : "border-stone-200 bg-white hover:border-stone-300"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-stone-800 font-medium truncate">{selected.domain}</span>
              <DomainStatusBadge status={selected.cfHostnameStatus} />
            </>
          ) : (
            <>
              <Link2Off className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="text-stone-400">No custom domain</span>
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* None option */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-stone-50 transition-colors cursor-pointer text-left",
              !value && "bg-primary/5 text-primary font-medium"
            )}
          >
            <Link2Off className="w-3.5 h-3.5 shrink-0" />
            <span>No custom domain</span>
            {!value && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
          </button>

          {domains.length > 0 && (
            <div className="border-t border-stone-100">
              {domains.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { onChange(d.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-stone-50 transition-colors cursor-pointer text-left",
                    value === d.id && "bg-primary/5 text-primary font-medium"
                  )}
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{d.domain}</span>
                  <DomainStatusBadge status={d.cfHostnameStatus} />
                  {value === d.id && <CheckCircle2 className="w-3 h-3 ml-1 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Add domain CTA */}
          <div className="border-t border-stone-100 px-3 py-2">
            <a
              href="/dashboard/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Manage domains
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SidebarSettings ──────────────────────────────────────────────────────────

export function SidebarSettings({
  slug,
  isPublished,
  seoTitle,
  seoDescription,
  showBranding,
  domains,
  customDomainId,
  onUpdate,
  onPublishToggle,
  isPublishing,
}: SidebarSettingsProps) {
  const [slugValue, setSlugValue] = useState(slug);
  const [slugError, setSlugError] = useState("");

  // Keep slug input in sync if parent changes it
  useEffect(() => {
    setSlugValue(slug);
  }, [slug]);

  function handleSlugBlur() {
    const trimmed = slugValue.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (trimmed.length < 3) {
      setSlugError("Slug must be at least 3 characters");
      return;
    }
    setSlugError("");
    if (trimmed !== slug) onUpdate({ slug: trimmed });
  }

  // Resolve the currently selected domain object
  const activeDomain = domains.find((d) => d.id === customDomainId) ?? null;
  const isActiveDomainLive =
    activeDomain?.cfHostnameStatus === "active" ||
    activeDomain?.cfHostnameStatus === "active_redeploying";

  // The live URL shown to the user
  const liveUrl = activeDomain
    ? `https://${activeDomain.domain}`
    : `https://pivoturl.com/p/${slug}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
        <h2 className="text-sm font-semibold text-stone-900">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

        {/* ── Publish ──────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            Visibility
          </h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isPublished ? "bg-green-500" : "bg-stone-400"
                }`}
              />
              <span className="text-sm font-medium text-stone-800">
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <button
              type="button"
              onClick={onPublishToggle}
              disabled={isPublishing}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                isPublished
                  ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {isPublishing && <Loader2 className="w-3 h-3 animate-spin" />}
              <Globe className="w-3 h-3" />
              {isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>

          {/* Live URL */}
          {isPublished && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{liveUrl}</span>
            </a>
          )}
        </section>

        {/* ── URL slug ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            Page URL
          </h3>
          <div className="flex items-center rounded-xl border border-stone-200 overflow-hidden bg-white">
            <span className="px-3 py-2 text-xs text-stone-400 bg-stone-50 border-r border-stone-200 shrink-0">
              /p/
            </span>
            <input
              type="text"
              value={slugValue}
              onChange={(e) => setSlugValue(e.target.value)}
              onBlur={handleSlugBlur}
              className="flex-1 px-3 py-2 text-xs text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="your-slug"
            />
          </div>
          {slugError && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {slugError}
            </p>
          )}
        </section>

        {/* ── Custom domain ─────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">
            Custom Domain
          </h3>
          <p className="text-xs text-stone-400 mb-3">
            Serve your bio page from your own domain instead of pivoturl.com/p/…
          </p>

          <DomainPicker
            domains={domains}
            value={customDomainId}
            onChange={(id) => onUpdate({ customDomainId: id })}
          />

          {/* Status messages */}
          {activeDomain && !isActiveDomainLive && (
            <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-700">DNS propagating</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  Your domain is being verified. This can take up to 24 hours. Your page is still accessible at{" "}
                  <span className="font-mono">pivoturl.com/p/{slug}</span>.
                </p>
              </div>
            </div>
          )}

          {activeDomain && isActiveDomainLive && (
            <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-green-700">Domain active</p>
                <p className="text-[11px] text-green-600 mt-0.5">
                  Your page is live at{" "}
                  <a
                    href={`https://${activeDomain.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline"
                  >
                    {activeDomain.domain}
                  </a>
                </p>
              </div>
            </div>
          )}

          {domains.length === 0 && (
            <p className="mt-2 text-xs text-stone-400">
              No verified domains yet.{" "}
              <a
                href="/dashboard/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Add a domain →
              </a>
            </p>
          )}
        </section>

        {/* ── SEO ──────────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            SEO
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Meta title
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => onUpdate({ seoTitle: e.target.value })}
                maxLength={200}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="My awesome page"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Meta description
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => onUpdate({ seoDescription: e.target.value })}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="A short description of your page"
              />
            </div>
          </div>
        </section>

        {/* ── Branding ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            Branding
          </h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => onUpdate({ showBranding: !showBranding })}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors cursor-pointer",
                showBranding ? "bg-primary" : "bg-stone-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  showBranding ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
            <span className="text-xs text-stone-700">Show "Made with PivotUrl"</span>
          </label>
        </section>

      </div>
    </div>
  );
}

"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { ArrowRight, Loader2, Link2, Sparkles, Check, Copy, Hash, Tag, Folder, QrCode } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { cn, getShortLinkBase, getDefaultDomain } from "@/lib/utils";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import { SharedQRCode } from "@/components/qr/SharedQRCode";
import Link from "next/link";

function buildShortUrl(slug: string) {
  return `${getShortLinkBase()}/${slug}`;
}

function buildQrUrl(slug: string) {
  return `https://${getDefaultDomain()}/s/${slug}?source=qr`;
}

type Props = {
  workspaceId: string;
  defaultDomain?: string;
};

type Result = {
  id: string;
  shortSlug: string;
  shortDomain: string;
  destination: string;
  /**
   * Persisted QR settings returned by POST /api/links. Always present now
   * because the API seeds defaults at creation; we keep it optional to
   * tolerate older clients / partial responses.
   */
  qrSettings?: QRSettings;
};

export function QuickCreateBar({ workspaceId, defaultDomain }: Props) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // AI auto-slug + smart tags
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiFolder, setAiFolder] = useState<string | null>(null);
  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [appliedFolder, setAppliedFolder] = useState<string | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // URL clipboard paste → auto-trigger AI
  const handleUrlChange = (value: string) => {
    setUrl(value);
    setResult(null);
    setError(null);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    // Only trigger AI if a valid URL is pasted
    try {
      new URL(value.startsWith("http") ? value : `https://${value}`);
    } catch {
      return; // Not a valid URL yet
    }

    aiTimerRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const normalized = value.startsWith("http") ? value : `https://${value}`;
        const res = await fetch("/api/ai/suggest-slug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalized, workspaceId }),
        });
        const data = await res.json();
        if (data.slug && !slug) setSlug(data.slug);
        if (data.suggestedTags?.length) {
          setAiTags(data.suggestedTags);
          setAppliedTags(data.suggestedTags);
        }
        if (data.suggestedFolder) {
          setAiFolder(data.suggestedFolder);
          setAppliedFolder(data.suggestedFolder);
        }
      } catch {
        // AI failed — silently fall back
      }
      setAiLoading(false);
    }, 600);
  };

  const clipboard = useClipboard();

  // Reset state on success
  useEffect(() => {
    if (result) {
      // Don't reset immediately — let user see success
    }
  }, [result]);

  function reset() {
    setUrl("");
    setSlug("");
    setResult(null);
    setError(null);
    setAiTags([]);
    setAiFolder(null);
    setAppliedTags([]);
    setAppliedFolder(null);
    inputRef.current?.focus();
  }

  function handleCreate() {
    if (!url.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const normalized = url.startsWith("http") ? url : `https://${url}`;
        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: normalized,
            slug: slug.trim() || undefined,
            workspaceId,
            tags: appliedTags.length > 0 ? appliedTags : undefined,
            ...(appliedFolder ? { folderName: appliedFolder } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to create link");
          return;
        }

      const data = await res.json();
      setResult({
        id: data.id ?? data.link?.id,
        shortSlug: data.shortSlug ?? data.link?.slug,
        shortDomain: data.shortDomain ?? getDefaultDomain(),
        destination: data.destination ?? data.link?.destination,
        // Pull the persisted settings so the success card shows the exact
        // same QR as the /dashboard/qr page. If the API ever returns
        // something partial we fall back to defaults.
        qrSettings: (data.qrSettings ?? data.link?.qrSettings ?? DEFAULT_QR_SETTINGS) as QRSettings,
      });
    } catch {
      setError("Network error. Please try again.");
    }
  });
}

  // ── Success state ─────────────────────────────────────────────────────────
  if (result) {
    const shortUrl = buildShortUrl(result.shortSlug);
    const qrUrl = buildQrUrl(result.shortSlug);
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 animate-in fade-in-0 duration-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-medium text-emerald-800">Link created</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <code className="flex-1 rounded-md bg-white/80 border border-emerald-200 px-3 py-1.5 text-sm text-emerald-900 font-mono truncate">
            {shortUrl}
          </code>
          <button
            type="button"
            onClick={() => clipboard.copy(shortUrl)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            {clipboard.copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {clipboard.copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex h-8 items-center rounded-md border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            New link
          </button>
        </div>
        {/* Live QR preview using the official main domain and the link's
            persisted qrSettings. ?source=qr lets the redirect handler
            attribute scans to this QR's analytics bucket. The QR is
            rendered by SharedQRCode so it always matches the one on
            /dashboard/qr (single source of truth). */}
        <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-white p-3">
          <div className="shrink-0 rounded bg-white p-1.5">
            <SharedQRCode
              link={{
                id: result.id,
                slug: result.shortSlug,
                qrSettings: result.qrSettings ?? DEFAULT_QR_SETTINGS,
              }}
              size={84}
              defaultDomain={defaultDomain}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <QrCode className="h-3 w-3" />
              QR code ready
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
              {qrUrl}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Scans will be tracked separately in QR Code Analytics
            </p>
            <Link
              href={`/dashboard/qr?focus=${encodeURIComponent(result.id)}`}
              className="mt-1 inline-block text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              Customize QR →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Input state ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
          <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="Paste a URL to shorten…"
            className="flex-1 border-0 bg-transparent px-2.5 py-2.5 text-sm outline-none placeholder:text-gray-400"
          />
          {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
        </div>

        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="Custom slug (optional)"
          className="w-full sm:w-44 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all font-mono"
        />

        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !url.trim()}
          className={cn(
            "flex h-[42px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-all",
            isPending || !url.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Shorten
            </>
          )}
        </button>
      </div>

      {/* AI-suggested tags */}
      {aiTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 animate-in slide-in-from-top-1 fade-in-0 duration-200">
          <Tag className="h-3 w-3 text-purple-500" />
          {aiTags.map((tag) => {
            const active = appliedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setAppliedTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                  active
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "bg-gray-100 text-gray-400 border border-gray-200 line-through"
                )}
              >
                {active ? "✓ " : ""}
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* AI-suggested folder */}
      {aiFolder && (
        <div className="flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in-0 duration-200">
          <Folder className="h-3 w-3 text-amber-500" />
          <button
            type="button"
            onClick={() => setAppliedFolder((prev) => (prev ? null : aiFolder))}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
              appliedFolder
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-gray-100 text-gray-400 border border-gray-200 line-through"
            )}
          >
            {appliedFolder ? "✓ " : ""}
            {aiFolder}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 animate-in slide-in-from-top-1 fade-in-0 duration-200">{error}</p>
      )}
    </div>
  );
}

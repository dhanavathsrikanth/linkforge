"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { ArrowRight, Loader2, Link2, Sparkles, Check, Copy } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { cn } from "@/lib/utils";

type Props = {
  workspaceId: string;
  defaultDomain?: string;
  onCreated?: (link: any) => void;
  onAdvanced?: (prefill: { destination?: string; slug?: string }) => void;
};

export function QuickCreateBar({
  workspaceId,
  defaultDomain = "linkforge.app",
  onCreated,
  onAdvanced,
}: Props) {
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; shortUrl: string } | null>(null);
  const { copied, copy } = useClipboard();
  const destRef = useRef<HTMLInputElement>(null);

  // Auto-clear error after typing
  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, slug]);

  function submit() {
    setError(null);
    const trimmed = destination.trim();
    if (!trimmed) {
      setError("Paste a URL to shorten");
      destRef.current?.focus();
      return;
    }

    // Auto-prefix protocol if missing
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      // Validate URL
      new URL(normalized);
    } catch {
      setError("Invalid URL");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: normalized,
            slug: slug.trim() || undefined,
            workspaceId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(typeof data?.error === "string" ? data.error : "Failed to create link");
          return;
        }
        const link = data.link;
        const shortUrl = `https://${defaultDomain}/${link.slug}`;
        setCreated({ slug: link.slug, shortUrl });
        setDestination("");
        setSlug("");
        onCreated?.(link);
      } catch (e: any) {
        setError(e?.message || "Network error");
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Quick create — paste a URL and press Enter
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {/* Domain + slug group */}
        <div className="flex h-11 items-center rounded-lg border border-border bg-background overflow-hidden md:w-[300px]">
          <span className="px-3 text-sm font-medium text-muted-foreground select-none">
            {defaultDomain}
          </span>
          <span className="text-muted-foreground/60">/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="auto"
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/50"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Destination */}
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={destRef}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="https://your-long-url.com/path"
            className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating
            </>
          ) : (
            <>
              Create
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Footer row */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-h-[1.25rem]">
          {error && <p className="text-xs font-medium text-red-500">{error}</p>}
          {!error && created && (
            <button
              type="button"
              onClick={() => copy(created.shortUrl)}
              className="group inline-flex items-center gap-2 text-xs font-medium text-primary"
            >
              <span className="opacity-90">Created:</span>
              <span className="rounded-md bg-primary/10 px-2 py-0.5">{created.shortUrl}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground">
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAdvanced?.({ destination, slug })}
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Advanced options →
        </button>
      </div>
    </div>
  );
}

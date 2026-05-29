"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Pencil,
  Settings2,
  BarChart3,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BioRowActionsProps {
  bioId: string;
  liveUrl: string;
  isPublished: boolean;
}

export function BioRowActions({ bioId, liveUrl, isPublished }: BioRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleCopy() {
    navigator.clipboard.writeText(liveUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        title="Actions"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-background shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
          <Link
            href={`/dashboard/bio/${bioId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            Edit
          </Link>
          <Link
            href={`/dashboard/bio/${bioId}/settings`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            Settings
          </Link>
          <Link
            href={`/dashboard/bio/${bioId}/analytics`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            Analytics
          </Link>

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {copied ? "Copied!" : "Copy URL"}
          </button>

          {isPublished && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              View live
            </a>
          )}
        </div>
      )}
    </div>
  );
}

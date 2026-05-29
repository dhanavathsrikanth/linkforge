"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { BioShareModal } from "./BioShareModal";

interface BioShareBarProps {
  url: string;
  displayName?: string | null;
}

export function BioShareBar({ url, displayName }: BioShareBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silent
    }
  }

  return (
    <>
      {/* Floating bar — fixed at bottom of viewport on mobile, inline on desktop */}
      <div className="flex items-center justify-center gap-2 mt-8 mb-2">
        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border"
          style={{
            backgroundColor: "hsl(var(--sys-bg-primary))",
            borderColor: "hsl(var(--sys-bg-border))",
            color: "hsl(var(--sys-label-primary))",
          }}
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy link</>
          )}
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer"
          style={{
            backgroundColor: "hsl(var(--sys-bg-primary))",
            border: "1px solid hsl(var(--sys-bg-border))",
            color: "hsl(var(--sys-label-primary))",
          }}
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <BioShareModal
          url={url}
          displayName={displayName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

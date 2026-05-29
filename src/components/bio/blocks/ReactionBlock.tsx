"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

// ─── Heart icon ───────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="none"
      className="fill-sys-label-primary"
      width={40}
      height={40}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

const MAX_REACTIONS = 16;
const EMOJI = "love";

// ─── ReactionBlock ────────────────────────────────────────────────────────────

export function ReactionBlock({ block, isEditable, onDelete }: Props) {
  // Server count — fetched on mount
  const [serverCount, setServerCount] = useState<number | null>(null);
  // Local optimistic additions (not yet confirmed by server)
  const [localAdded, setLocalAdded] = useState(0);
  // How many this IP has already reacted (from server)
  const [myCount, setMyCount] = useState(0);
  // Whether we've hit the per-IP cap
  const [atCap, setAtCap] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(0);
  const isSubmittingRef = useRef(false);

  // ── Fetch initial count ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditable) return; // Don't fetch in editor — no real blockId yet
    if (!block.id) return;

    fetch(`/api/bio/reactions?blockId=${block.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const total = data.total?.[EMOJI] ?? 0;
        const current = data.current?.[EMOJI] ?? 0;
        setServerCount(total);
        setMyCount(current);
        setAtCap(current >= MAX_REACTIONS);
      })
      .catch(() => {
        // Non-blocking — show 0 if fetch fails
        setServerCount(0);
      });
  }, [block.id, isEditable]);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Submit pending reactions ─────────────────────────────────────────────────
  const submitPending = useCallback(async () => {
    const increment = pendingRef.current;
    if (increment <= 0 || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    pendingRef.current = 0;

    try {
      const res = await fetch("/api/bio/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id, increment, emoji: EMOJI }),
        keepalive: true,
      });

      if (res.ok) {
        const data = await res.json();
        const newTotal = data.total?.[EMOJI] ?? 0;
        const newCurrent = data.current?.[EMOJI] ?? 0;
        // Sync server state — clear local additions since server confirmed
        setServerCount(newTotal);
        setMyCount(newCurrent);
        setLocalAdded(0);
        setAtCap(newCurrent >= MAX_REACTIONS);
      }
    } catch {
      // Best-effort — keep local count as-is
    } finally {
      isSubmittingRef.current = false;
    }
  }, [block.id]);

  // ── Handle click ─────────────────────────────────────────────────────────────
  function handleClick() {
    if (isEditable) return;
    if (atCap) return;
    if (myCount + localAdded >= MAX_REACTIONS) {
      setAtCap(true);
      return;
    }

    setLocalAdded((n) => n + 1);
    pendingRef.current += 1;

    // Debounce: wait 1.6s after last click before submitting
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(submitPending, 1600);
  }

  // ── Derived display values ───────────────────────────────────────────────────
  // Show 0 while loading (serverCount === null), then real count + local additions
  const displayCount = serverCount === null ? 0 : serverCount + localAdded;
  const fillPercent = Math.min(((myCount + localAdded) / MAX_REACTIONS) * 100, 100);
  const isLoading = serverCount === null && !isEditable;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      className="relative !p-0 overflow-hidden"
      onDelete={onDelete}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isEditable || atCap}
        aria-label={atCap ? "Maximum reactions reached" : "React with love"}
        className="flex items-center justify-between gap-2 py-4 px-4 relative w-full h-full bg-sys-bg-primary cursor-pointer disabled:cursor-default select-none"
      >
        {/* Left: label + count */}
        <div className="flex flex-col text-left gap-1 z-10">
          <span className="uppercase font-bold text-xs tracking-wider text-sys-label-primary">
            Love
          </span>
          <span
            className="text-4xl font-medium text-sys-label-primary tabular-nums transition-all duration-150"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading ? (
              <span className="inline-block w-8 h-9 rounded-lg bg-sys-bg-secondary animate-pulse" />
            ) : (
              displayCount.toLocaleString()
            )}
          </span>
          {atCap && (
            <span className="text-[10px] text-sys-label-secondary">Max reached</span>
          )}
        </div>

        {/* Right: heart icon */}
        <div className="mr-8 flex justify-center z-10">
          <HeartIcon />
        </div>

        {/* Animated wave fill — rises as user reacts */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
          <div
            className="w-full transition-all duration-300 ease-in-out"
            style={{ height: fillPercent > 0 ? `calc(${fillPercent}% + 32px)` : "0px" }}
          >
            <svg
              width="100%"
              height={32}
              preserveAspectRatio="none"
              viewBox="0 0 1440 320"
            >
              <path
                fill="#FF6096"
                d="m0 128 26.7-5.3c26.6-5.7 80.3-15.7 133.3 0 53.3 16.3 107 58.3 160 74.6 53.3 15.7 107 5.7 160 0 53.3-5.3 107-5.3 160 10.7 53.3 16 107 48 160 48 53.3 0 107-32 160-74.7 53.3-42.3 107-96.3 160-90.6 53.3 5.3 107 69.3 160 80 53.3 10.3 107-31.7 133-53.4l27-21.3v224H0Z"
              />
            </svg>
            <div className="w-full h-full bg-gradient-to-b from-[#FF6096] to-[#FF2A76]" />
          </div>
        </div>
      </button>
    </CoreBlock>
  );
}

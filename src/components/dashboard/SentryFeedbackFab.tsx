"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";

/**
 * Draggable floating action button that opens the Sentry feedback dialog.
 *
 * Replaces the default Sentry feedback button (hidden via CSS) to prevent
 * it from blocking content behind it. The button can be dragged anywhere
 * on the screen and snaps to the nearest horizontal edge when released.
 */
export function SentryFeedbackFab() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const pos = useRef({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 99999,
  });

  const SNAP_OFFSET = 12;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      moved.current = false;
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      start.current = { x: e.clientX, y: e.clientY, px: rect.left, py: rect.top };
      pos.current = { x: rect.left, y: rect.top };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      const x = start.current.px + dx;
      const y = start.current.py + dy;
      pos.current = { x, y };
      setPosStyle((prev) => ({
        ...prev,
        left: x,
        top: y,
        bottom: "auto",
        right: "auto",
        transition: "none",
      }));
    },
    [],
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;

      // Snap to nearest horizontal edge
      const vw = window.innerWidth;
      const btnW = btnRef.current?.offsetWidth ?? 48;
      const x = pos.current.x;
      const snappedRight = x + btnW / 2 > vw / 2;
      const finalX = snappedRight ? vw - btnW - SNAP_OFFSET : SNAP_OFFSET;

      setPosStyle((prev) => ({
        ...prev,
        left: finalX,
        top: "auto",
        bottom: SNAP_OFFSET,
        right: "auto",
        transition: "left 0.2s ease, bottom 0.2s ease",
      }));
    },
    [],
  );

  // Prevent text selection while dragging
  useEffect(() => {
    const onDragStart = (e: Event) => {
      if (dragging.current) e.preventDefault();
    };
    document.addEventListener("dragstart", onDragStart);
    return () => document.removeEventListener("dragstart", onDragStart);
  }, []);

  const handleClick = useCallback(() => {
    // If the user just dragged, don't open the dialog
    if (moved.current) return;

    // Find and click the hidden Sentry feedback trigger
    const sentryBtn = document.querySelector<HTMLButtonElement>(
      '[data-sentry-feedback] button, [aria-label="Report a bug"], button[class*="sentry"]'
    );
    if (sentryBtn) {
      sentryBtn.click();
      return;
    }

    // Fallback: try to access the Sentry integration directly
    try {
      // @ts-expect-error — Sentry internal API
      const hub = window.__SENTRY__?.hub;
      const client = hub?.getClient?.();
      const integration = client?.getIntegration?.("Feedback");
      if (integration) {
        integration.createWidget?.();
      }
    } catch {
      // Silently fail if Sentry isn't loaded yet
    }
  }, []);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="group flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-shadow hover:shadow-xl hover:scale-105 dark:bg-slate-700 cursor-grab active:cursor-grabbing select-none sm:h-14 sm:w-14"
      style={posStyle}
      title="Report an issue"
      aria-label="Report an issue"
    >
      <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
    </button>
  );
}

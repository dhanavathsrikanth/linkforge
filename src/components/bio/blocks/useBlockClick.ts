"use client";

import { useCallback } from "react";

/**
 * Returns a fire-and-forget click tracker for a bio block.
 * Sends a POST to /api/v1/gallery-block-events with eventType="click".
 *
 * - Only fires when isEditable=false (never in the editor)
 * - Uses keepalive so the request survives page navigation
 * - Silently swallows all errors — never blocks the user action
 */
export function useBlockClick(
  blockId: string,
  isEditable: boolean,
  metadata?: Record<string, unknown>
): () => void {
  return useCallback(() => {
    if (isEditable || !blockId) return;

    // Fire-and-forget — don't await, don't block
    fetch("/api/v1/gallery-block-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId,
        eventType: "click",
        metadata: metadata ?? {},
      }),
      keepalive: true,
    }).catch(() => {
      // Intentionally silent
    });
  }, [blockId, isEditable, metadata]);
}

/**
 * Returns a fire-and-forget submission tracker for a bio block.
 * Sends a POST to /api/v1/gallery-block-events with eventType="submission".
 */
export function useBlockSubmission(
  blockId: string,
  isEditable: boolean
): (metadata?: Record<string, unknown>) => void {
  return useCallback(
    (metadata?: Record<string, unknown>) => {
      if (isEditable || !blockId) return;

      fetch("/api/v1/gallery-block-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId,
          eventType: "submission",
          metadata: metadata ?? {},
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [blockId, isEditable]
  );
}

"use client";

import { useCallback } from "react";

export type BlockEventType = "click" | "reaction" | "submission" | "view";

export function useBlockTracking(blockId?: string, blockType?: string) {
  const trackEvent = useCallback(
    async (eventType: BlockEventType, metadata?: Record<string, unknown>) => {
      if (!blockId || !blockType) return;
      try {
        await fetch("/api/v1/gallery-block-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId,
            eventType,
            metadata: { ...metadata, _blockType: blockType },
          }),
          keepalive: true,
        });
      } catch {
        // best-effort
      }
    },
    [blockId, blockType]
  );

  return { trackEvent };
}

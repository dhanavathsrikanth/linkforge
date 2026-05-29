"use client";

import { useEffect, useState } from "react";

/**
 * Fetches live data for an integration block from /api/bio/blocks/[blockId]/data.
 * Returns { data, loading, error }.
 *
 * - Only fetches when isEditable=false (no live data in the editor)
 * - Caches for 60s (matches the API Cache-Control header)
 * - Returns null data when the integration is not connected
 */
export function useBlockData<T>(
  blockId: string,
  isEditable: boolean
): { data: T | null; loading: boolean; error: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!isEditable);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isEditable || !blockId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/bio/blocks/${blockId}/data`, {
      // Use browser cache — API sets Cache-Control: max-age=60
      cache: "default",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((body) => {
        if (!cancelled) {
          setData(body.data ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [blockId, isEditable]);

  return { data, loading, error };
}

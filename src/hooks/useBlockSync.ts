"use client";

import { useState, useEffect, useRef } from "react";

const STALE_AFTER_MS = 5 * 60 * 1000;

interface UseBlockSyncOptions {
  blockId: string;
  blockType: string;
  integrationId?: string | null;
  data?: Record<string, unknown> | null;
}

export function useBlockSync({ blockId, blockType, integrationId, data }: UseBlockSyncOptions) {
  const [syncedData, setSyncedData] = useState<Record<string, unknown>>(data ?? {});
  const [syncing, setSyncing] = useState(false);
  const syncKeyRef = useRef<string | null>(null);
  // Keep a ref to the latest syncedData so the sync effect can read it without
  // being re-triggered on every data change (avoids infinite loops).
  const syncedDataRef = useRef<Record<string, unknown>>(data ?? {});

  useEffect(() => {
    const next = data ?? {};
    setSyncedData(next);
    syncedDataRef.current = next;
  }, [data]);

  useEffect(() => {
    if (!blockId || !blockType) return;
    if (!integrationId) return;

    const key = `${blockId}-${integrationId}`;
    if (syncKeyRef.current === key) return;

    const existing = syncedDataRef.current;
    const lastSync = existing.syncedAt as string | undefined;
    const needsSync = !lastSync || Date.now() - new Date(lastSync).getTime() > STALE_AFTER_MS;
    if (!needsSync) return;

    syncKeyRef.current = key;
    setSyncing(true);

    fetch(`/api/gallery/sync/${blockId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
        return res.json();
      })
      .then((fresh) => {
        if (fresh && !fresh._cached) {
          setSyncedData(fresh);
          syncedDataRef.current = fresh;
        }
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [blockId, blockType, integrationId]);

  return { syncedData, syncing };
}

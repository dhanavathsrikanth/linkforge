'use client';

import { useState, useCallback, useEffect } from 'react';

type WsMessage =
  | { type: 'initial'; flags: Record<string, any> }
  | { type: 'flag_update'; key: string; value: any; workspaceId: string }
  | { type: 'flag_delete'; key: string; workspaceId: string };

export function useFeatureFlags(workspaceId: string) {
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/do/flags/${workspaceId}/ws`);
    setWs(socket);

    socket.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as WsMessage;
        if (data.type === 'initial') {
          setFlags(data.flags);
        } else if (data.type === 'flag_update') {
          setFlags((prev) => ({ ...prev, [data.key]: data.value }));
        } else if (data.type === 'flag_delete') {
          setFlags((prev) => {
            const next = { ...prev };
            delete next[data.key];
            return next;
          });
        }
      } catch {}
    });

    return () => socket.close();
  }, [workspaceId]);

  const getFlag = useCallback((key: string, defaultValue?: any) => {
    return key in flags ? flags[key] : defaultValue;
  }, [flags]);

  const setFlag = useCallback(async (key: string, value: any, type?: string, description?: string) => {
    const res = await fetch(`/do/flags/${workspaceId}/set/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, type, description }),
    });
    if (res.ok) setFlags((prev) => ({ ...prev, [key]: value }));
  }, [workspaceId]);

  const deleteFlag = useCallback(async (key: string) => {
    await fetch(`/do/flags/${workspaceId}/delete/${key}`, { method: 'DELETE' });
    setFlags((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [workspaceId]);

  return { flags, getFlag, setFlag, deleteFlag };
}

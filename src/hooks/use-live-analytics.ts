'use client';

import { useState, useCallback } from 'react';
import { useWebSocket } from './use-websocket';

export interface LiveClickEvent {
  slug: string;
  device: string;
  country: string;
  city: string;
  browser?: string;
  os?: string;
  referrer?: string;
  variant?: string;
  timestamp: number;
}

export function useLiveAnalytics(linkId: string, enabled = true) {
  const [clicks, setClicks] = useState<LiveClickEvent[]>([]);
  const [recentClick, setRecentClick] = useState<LiveClickEvent | null>(null);
  const [clickCount, setClickCount] = useState(0);

  const handleMessage = useCallback((data: any) => {
    if (data.type === 'click') {
      const event = data.data as LiveClickEvent;
      setClicks((prev) => [event, ...prev].slice(0, 100));
      setRecentClick(event);
      setClickCount((c) => c + 1);
    }
  }, []);

  const ws = useWebSocket({
    doName: 'analytics-ws',
    doId: `ws:${linkId}`,
    onMessage: handleMessage,
    enabled,
  });

  const subscribeToLink = useCallback(() => {
    ws.send({ type: 'subscribe', linkId });
  }, [ws, linkId]);

  return { clicks, recentClick, clickCount, connected: ws.connected, reconnecting: ws.reconnecting, subscribeToLink, subscribe: ws.subscribe };
}

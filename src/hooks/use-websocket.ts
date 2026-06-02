'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type MessageHandler = (data: any) => void;

export function useWebSocket(options: {
  doName: string;
  doId: string;
  onMessage?: MessageHandler;
  enabled?: boolean;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  if (options.onMessage) handlersRef.current.add(options.onMessage);

  const connect = useCallback(() => {
    if (options.enabled === false) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/do/${options.doName}/${options.doId}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setConnected(true);
      setReconnecting(false);
      reconnectRef.current = 0;
    });

    ws.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        for (const handler of handlersRef.current) handler(data);
      } catch {}
    });

    ws.addEventListener('close', () => {
      setConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
      reconnectRef.current++;
      setReconnecting(true);
      setTimeout(() => connect(), delay);
    });

    ws.addEventListener('error', () => ws.close());
  }, [options.doName, options.doId, options.enabled]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  return { connected, reconnecting, send, subscribe };
}

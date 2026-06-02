"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { realtimeCollaboration, type PresenceUser } from "@/lib/realtime-collaboration";

interface RealtimeContextValue {
  isConnected: boolean;
  activeUsers: PresenceUser[];
  lastEvent: null; // Deprecated: use React Query polling instead
  refreshData: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  activeUsers: [],
  lastEvent: null,
  refreshData: () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  workspaceId: string | null;
  children: React.ReactNode;
}

export function RealtimeProvider({ workspaceId, children }: RealtimeProviderProps) {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const workspaceRef = useRef<string | null>(null);
  const initAttemptedRef = useRef(false);

  const refreshData = useCallback(() => {
    if (workspaceId) {
      queryClient.invalidateQueries({ queryKey: ["links", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] });
    }
  }, [workspaceId, queryClient]);

  useEffect(() => {
    if (!isLoaded || !user || !workspaceId) {
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      setIsConnected(false);
      return;
    }

    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const initRealtime = async () => {
      try {
        await realtimeCollaboration.initialize(
          user.id,
          user.fullName || user.username || "Anonymous",
          user.imageUrl || undefined
        );

        // Connect to WorkspacePresence DO via WebSocket for real-time presence
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/do/presence/workspace:${workspaceId}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          // Send presence announcement
          ws.send(JSON.stringify({
            type: 'presence',
            userId: user.id,
            name: user.fullName || user.username || "Anonymous",
            imageUrl: user.imageUrl || undefined,
            page: window.location.pathname,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'initial_state') {
              // Filter out stale users (lastSeen < 60s ago)
              const users = (msg.users || []).filter((u: PresenceUser) => Date.now() - u.lastSeen < 60000);
              setActiveUsers(users);
            } else if (msg.type === 'presence_update') {
              setActiveUsers(prev => {
                const idx = prev.findIndex(u => u.id === msg.userId);
                const updated = msg.state;
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = updated;
                  return next;
                }
                return [...prev, updated];
              });
            } else if (msg.type === 'presence_leave') {
              setActiveUsers(prev => prev.filter(u => u.id !== msg.userId));
            }
          } catch {}
        };

        ws.onerror = () => {
          console.warn("[RealtimeProvider] WebSocket error, falling back to polling");
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.warn("[RealtimeProvider] WebSocket closed, falling back to polling");
          setIsConnected(false);
          wsRef.current = null;
        };

        workspaceRef.current = workspaceId;

        // Polling fallback if WebSocket fails
        presenceIntervalRef.current = setInterval(async () => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            const users = await realtimeCollaboration.getActiveUsers(workspaceId);
            setActiveUsers(users);
          }
        }, 5000);

        // Initial fetch
        const initialUsers = wsRef.current?.readyState === WebSocket.OPEN 
          ? [] // Will be populated via WebSocket initial_state
          : await realtimeCollaboration.getActiveUsers(workspaceId);
        setActiveUsers(initialUsers);

      } catch {
        setIsConnected(false);
      }
    };

    initRealtime();

    return () => {
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (workspaceRef.current && workspaceRef.current !== workspaceId) {
        realtimeCollaboration.unsubscribeFromWorkspace(workspaceRef.current);
      }
      setIsConnected(false);
      initAttemptedRef.current = false;
    };
  }, [user, isLoaded, workspaceId, refreshData]);

  useEffect(() => {
    return () => {
      if (workspaceRef.current) {
        realtimeCollaboration.unsubscribeFromWorkspace(workspaceRef.current);
      }
      realtimeCollaboration.cleanup();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, activeUsers, lastEvent: null, refreshData }}>
      {children}
    </RealtimeContext.Provider>
  );
}

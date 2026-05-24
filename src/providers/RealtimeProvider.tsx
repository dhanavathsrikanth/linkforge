"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { realtimeCollaboration, type RealtimeEvent, type PresenceUser } from "@/lib/realtime-collaboration";

interface RealtimeContextValue {
  isConnected: boolean;
  activeUsers: PresenceUser[];
  lastEvent: RealtimeEvent | null;
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
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
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

        await realtimeCollaboration.subscribeToWorkspace(workspaceId);
        workspaceRef.current = workspaceId;
        setIsConnected(true);

        const unsubscribe = realtimeCollaboration.onEvent(workspaceId, (event) => {
          setLastEvent(event);

          if (event.userId !== user.id) {
            refreshData();
          }
        });

        presenceIntervalRef.current = setInterval(async () => {
          const users = await realtimeCollaboration.getActiveUsers(workspaceId);
          setActiveUsers(users);
        }, 5000);

        const initialUsers = await realtimeCollaboration.getActiveUsers(workspaceId);
        setActiveUsers(initialUsers);

        return () => {
          unsubscribe();
        };
      } catch {
        setIsConnected(false);
      }
    };

    const cleanup = initRealtime();

    return () => {
      cleanup.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
        if (workspaceRef.current && workspaceRef.current !== workspaceId) {
          realtimeCollaboration.unsubscribeFromWorkspace(workspaceRef.current);
        }
      });
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
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
    <RealtimeContext.Provider value={{ isConnected, activeUsers, lastEvent, refreshData }}>
      {children}
    </RealtimeContext.Provider>
  );
}

"use client";

import React, { createContext, useContext, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface LiveAnalyticsContextValue {
  pushClickEvent: (linkId: string, data: any) => Promise<void>;
  pushQrScan: (qrId: string, scanData: any) => Promise<void>;
  recordAbVariant: (testId: string, variantId: string) => Promise<void>;
  scheduleTask: (tag: string, action: string, payload: any, scheduledAt: number) => Promise<any>;
  acquireLock: (key: string, ttl?: number) => Promise<boolean>;
  releaseLock: (key: string, token: string) => Promise<void>;
  appendAuditLog: (workspaceId: string, actorId: string, actorName: string, action: string, resourceType: string, resourceId: string, details?: any) => Promise<void>;
}

const LiveAnalyticsContext = createContext<LiveAnalyticsContextValue>({
  pushClickEvent: async () => {},
  pushQrScan: async () => {},
  recordAbVariant: async () => {},
  scheduleTask: async () => {},
  acquireLock: async () => false,
  releaseLock: async () => {},
  appendAuditLog: async () => {},
});

export function useLiveAnalyticsApi() {
  return useContext(LiveAnalyticsContext);
}

export function LiveAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const tokenRef = useRef<string>(crypto.randomUUID());

  const pushClickEvent = useCallback(async (linkId: string, data: any) => {
    await fetch(`/do/analytics-ws/link:${linkId}/push`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
  }, []);

  const pushQrScan = useCallback(async (qrId: string, scanData: any) => {
    await fetch(`/do/qr/${qrId}/push-scan`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrId, scanData }),
    });
  }, []);

  const recordAbVariant = useCallback(async (testId: string, variantId: string) => {
    await fetch(`/do/abtest/ab:${testId}/record`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId, variantId }),
    });
  }, []);

  const scheduleTask = useCallback(async (tag: string, action: string, payload: any, scheduledAt: number) => {
    const res = await fetch(`/do/scheduler/default`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, action, payload, scheduledAt }),
    });
    return res.json();
  }, []);

  const acquireLock = useCallback(async (key: string, ttl = 30) => {
    const token = tokenRef.current;
    const res = await fetch(`/do/locker/${key}?key=${key}&ttl=${ttl}&token=${token}`, { method: "POST" });
    const data = await res.json();
    return data.acquired;
  }, []);

  const releaseLock = useCallback(async (key: string, token: string) => {
    await fetch(`/do/locker/${key}?key=${key}&token=${token}`, { method: "DELETE" });
  }, []);

  const appendAuditLog = useCallback(async (workspaceId: string, actorId: string, actorName: string, action: string, resourceType: string, resourceId: string, details?: any) => {
    await fetch(`/do/event-log/${workspaceId}/append`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, actorId, actorName, action, resourceType, resourceId, details }),
    });
  }, []);

  return (
    <LiveAnalyticsContext.Provider value={{ pushClickEvent, pushQrScan, recordAbVariant, scheduleTask, acquireLock, releaseLock, appendAuditLog }}>
      {children}
    </LiveAnalyticsContext.Provider>
  );
}

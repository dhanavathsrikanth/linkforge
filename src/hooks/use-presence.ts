'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './use-websocket';
import { useUser } from '@clerk/nextjs';

export interface PresenceUser {
  userId: string;
  name: string;
  imageUrl?: string;
  page?: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

export function usePresence(workspaceId: string, enabled = true) {
  const { user } = useUser();
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [currentPage, setCurrentPage] = useState<string>('');

  const handleMessage = useCallback((data: any) => {
    if (data.type === 'initial_state') {
      setUsers(data.users);
    } else if (data.type === 'presence_update') {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.userId === data.userId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.state;
          return next;
        }
        return [...prev, data.state];
      });
    } else if (data.type === 'presence_leave') {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    } else if (data.type === 'cursor_move') {
      setUsers((prev) => prev.map((u) =>
        u.userId === data.userId ? { ...u, cursor: data.cursor } : u
      ));
    }
  }, []);

  const ws = useWebSocket({
    doName: 'presence',
    doId: `workspace:${workspaceId}`,
    onMessage: handleMessage,
    enabled: enabled && !!user,
  });

  const updatePresence = useCallback((page?: string, cursor?: { x: number; y: number }) => {
    if (!user) return;
    ws.send({
      type: 'presence',
      userId: user.id,
      name: user.fullName || user.emailAddresses?.[0]?.emailAddress || 'Unknown',
      imageUrl: user.imageUrl,
      page: page || currentPage,
      cursor,
    });
  }, [user, ws, currentPage]);

  const updateCursor = useCallback((cursor: { x: number; y: number }) => {
    if (!user) return;
    ws.send({ type: 'cursor', userId: user.id, cursor });
  }, [user, ws]);

  useEffect(() => {
    const interval = setInterval(() => updatePresence(), 30000);
    updatePresence();
    return () => clearInterval(interval);
  }, [updatePresence]);

  const activeUsers = users.filter((u) => Date.now() - u.lastSeen < 60000);

  return { users: activeUsers, updatePresence, updateCursor, setCurrentPage, connected: ws.connected };
}

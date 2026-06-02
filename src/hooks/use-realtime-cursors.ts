'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePresence, PresenceUser } from './use-presence';

interface CursorData {
  userId: string;
  name: string;
  x: number;
  y: number;
}

export function useRealtimeCursors(workspaceId: string, containerRef: React.RefObject<HTMLElement | null>, enabled = true) {
  const { users, updateCursor, connected } = usePresence(workspaceId, enabled);
  const cursorsRef = useRef<Map<string, CursorData>>(new Map());

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    updateCursor({
      x: Math.round((e.clientX - rect.left) / rect.width * 100),
      y: Math.round((e.clientY - rect.top) / rect.height * 100),
    });
  }, [containerRef, updateCursor]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const el = containerRef.current;
    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, [enabled, containerRef, handleMouseMove]);

  const cursors: CursorData[] = users
    .filter((u) => u.cursor)
    .map((u) => ({
      userId: u.userId,
      name: u.name,
      x: u.cursor!.x,
      y: u.cursor!.y,
    }));

  return { cursors, connected };
}

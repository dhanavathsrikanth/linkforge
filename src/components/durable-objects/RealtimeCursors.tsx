'use client';

import { useRealtimeCursors } from '@/hooks/use-realtime-cursors';
import { motion } from 'framer-motion';

export function RealtimeCursors({
  workspaceId,
  containerRef,
  enabled = true,
}: {
  workspaceId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}) {
  const { cursors, connected } = useRealtimeCursors(workspaceId, containerRef, enabled);

  if (!connected || cursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.userId}
          className="absolute flex items-start gap-1"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" className="drop-shadow-md">
            <path d="M1 1L6 15L8 9L14 7L1 1Z" fill="var(--primary)" stroke="white" strokeWidth="0.5" />
          </svg>
          <span
            className="mt-4 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground whitespace-nowrap shadow-sm"
          >
            {cursor.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

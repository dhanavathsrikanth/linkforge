'use client';

import { usePresence } from '@/hooks/use-presence';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

export function PresenceAvatars({ workspaceId }: { workspaceId: string }) {
  const { users, connected } = usePresence(workspaceId);

  return (
    <div className="flex items-center gap-1.5">
      {!connected && <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
      {connected && users.length === 0 && (
        <span className="text-[11px] text-muted-foreground">No one else online</span>
      )}
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user, i) => (
          <motion.div
            key={user.userId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Tooltip content={
              <div>
                <p className="text-xs">{user.name}</p>
                {user.page && <p className="text-[10px] text-muted-foreground">on {user.page}</p>}
              </div>
            }>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar
                    src={user.imageUrl}
                    alt={user.name}
                    fallback={user.name.charAt(0).toUpperCase()}
                    size="sm"
                    className="ring-2 ring-background"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                </div>
              </TooltipTrigger>
            </Tooltip>
          </motion.div>
        ))}
      </div>
      {users.length > 5 && (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          +{users.length - 5}
        </span>
      )}
      {connected && (
        <span className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Wifi className="h-3 w-3 text-emerald-500" />
          {users.length} online
        </span>
      )}
    </div>
  );
}

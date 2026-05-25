"use client";

import { useRealtime } from "@/providers/RealtimeProvider";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

export function ActiveUsersIndicator() {
  const { activeUsers, isConnected } = useRealtime();

  if (!isConnected || activeUsers.length === 0) {
    return null;
  }

  const displayUsers = activeUsers.slice(0, 3);
  const remainingCount = activeUsers.length - 3;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex items-center">
          <div className="relative flex -space-x-2">
            {displayUsers.map((user) => (
              <Tooltip
                key={user.id}
                content={
                  <div className="text-center">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">Active now</p>
                  </div>
                }
              >
                <Avatar
                  src={user.imageUrl}
                  alt={user.name}
                  fallback={user.name.charAt(0).toUpperCase()}
                  className="h-7 w-7 border-2 border-background"
                  size="sm"
                />
              </Tooltip>
            ))}
            {remainingCount > 0 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                +{remainingCount}
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

export function RealtimeStatusIndicator() {
  const { isConnected, lastEvent } = useRealtime();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip
        content={
          <div>
            <p className="text-xs">Real-time sync active</p>
            {lastEvent && (
              <p className="text-xs text-muted-foreground">
                Last update: {new Date(lastEvent.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </div>
          <Wifi className="h-3.5 w-3.5" />
          <span>Live</span>
        </div>
      </Tooltip>
    </TooltipProvider>
  );
}

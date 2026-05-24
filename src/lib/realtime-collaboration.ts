import { Redis } from "@upstash/redis";

export interface RealtimeEvent {
  type: "link_created" | "link_updated" | "link_deleted" | "folder_created" | "folder_updated" | "folder_deleted" | "member_joined" | "member_left";
  workspaceId: string;
  userId: string;
  userName?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface PresenceUser {
  id: string;
  name: string;
  imageUrl?: string;
  lastSeen: number;
}

class RealtimeCollaboration {
  private redis: Redis | null = null;
  private isAvailable: boolean = false;
  private subscribedChannels: Set<string> = new Set();
  private eventListeners: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private presenceInterval: NodeJS.Timeout | null = null;
  private currentWorkspaceId: string | null = null;
  private currentUser: { id: string; name: string; imageUrl?: string } | null = null;

  constructor() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      console.warn("[Realtime] Upstash Redis environment variables not set. Realtime features disabled.");
      this.isAvailable = false;
      return;
    }

    if (!upstashUrl.startsWith("https://")) {
      console.warn("[Realtime] Invalid Upstash Redis URL. Realtime features disabled.");
      this.isAvailable = false;
      return;
    }

    try {
      this.redis = new Redis({
        url: upstashUrl,
        token: upstashToken,
      });
      this.isAvailable = true;
    } catch {
      console.warn("[Realtime] Failed to initialize Upstash Redis client. Realtime features disabled.");
      this.isAvailable = false;
    }
  }

  async initialize(userId: string, userName: string, imageUrl?: string) {
    this.currentUser = { id: userId, name: userName, imageUrl };
  }

  async subscribeToWorkspace(workspaceId: string) {
    if (!this.isAvailable || !this.redis) return;

    const channel = `workspace:${workspaceId}:events`;
    
    if (this.subscribedChannels.has(channel)) return;
    
    this.subscribedChannels.add(channel);
    this.currentWorkspaceId = workspaceId;

    await this.startPresenceTracking(workspaceId);
  }

  async unsubscribeFromWorkspace(workspaceId: string) {
    if (!this.isAvailable || !this.redis) return;

    const channel = `workspace:${workspaceId}:events`;
    
    this.subscribedChannels.delete(channel);
    
    if (this.currentWorkspaceId === workspaceId) {
      this.currentWorkspaceId = null;
    }

    await this.stopPresenceTracking(workspaceId);
  }

  private async startPresenceTracking(workspaceId: string) {
    if (!this.currentUser || !this.redis || !this.isAvailable) return;

    try {
      await this.redis.hset(`presence:${workspaceId}`, {
        [this.currentUser.id]: JSON.stringify({
          id: this.currentUser.id,
          name: this.currentUser.name,
          imageUrl: this.currentUser.imageUrl,
          lastSeen: Date.now(),
        }),
      });

      await this.redis.expire(`presence:${workspaceId}`, 60);

      this.presenceInterval = setInterval(async () => {
        if (this.currentWorkspaceId && this.currentUser && this.redis && this.isAvailable) {
          await this.redis.hset(`presence:${this.currentWorkspaceId}`, {
            [this.currentUser.id]: JSON.stringify({
              id: this.currentUser.id,
              name: this.currentUser.name,
              imageUrl: this.currentUser.imageUrl,
              lastSeen: Date.now(),
            }),
          });
          await this.redis.expire(`presence:${this.currentWorkspaceId}`, 60);
        }
      }, 30000);
    } catch {
      console.warn("[Realtime] Failed to start presence tracking. Redis may not be available.");
    }
  }

  private async stopPresenceTracking(workspaceId: string) {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }

    if (this.currentUser && this.redis && this.isAvailable) {
      try {
        await this.redis.hdel(`presence:${workspaceId}`, this.currentUser.id);
      } catch {
        // Silently ignore errors during cleanup
      }
    }
  }

  async getActiveUsers(workspaceId: string): Promise<PresenceUser[]> {
    if (!this.redis || !this.isAvailable) return [];

    try {
      const presence = await this.redis.hgetall(`presence:${workspaceId}`);
      
      if (!presence) return [];

      const now = Date.now();
      const activeUsers: PresenceUser[] = [];

      for (const [, value] of Object.entries(presence)) {
        if (typeof value === "string") {
          const user = JSON.parse(value) as PresenceUser;
          if (now - user.lastSeen < 60000) {
            activeUsers.push(user);
          }
        }
      }

      return activeUsers;
    } catch {
      return [];
    }
  }

  async publishEvent(event: Omit<RealtimeEvent, "timestamp">) {
    if (!this.redis || !this.isAvailable) return;

    const fullEvent: RealtimeEvent = {
      ...event,
      timestamp: Date.now(),
    };

    try {
      await this.redis.publish(`workspace:${event.workspaceId}:events`, JSON.stringify(fullEvent));
    } catch (error) {
      console.warn("[Realtime] Failed to publish event:", error);
    }
  }

  onEvent(workspaceId: string, callback: (event: RealtimeEvent) => void) {
    const channel = `workspace:${workspaceId}:events`;
    
    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set());
    }
    
    this.eventListeners.get(channel)!.add(callback);

    return () => {
      this.eventListeners.get(channel)?.delete(callback);
    };
  }

  async triggerRefresh(workspaceId: string, type: RealtimeEvent["type"], userId: string, userName?: string) {
    await this.publishEvent({
      type,
      workspaceId,
      userId,
      userName,
      data: { triggeredAt: Date.now() },
    });
  }

  cleanup() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
    this.subscribedChannels.clear();
    this.eventListeners.clear();
    this.currentWorkspaceId = null;
    this.currentUser = null;
  }
}

export const realtimeCollaboration = new RealtimeCollaboration();

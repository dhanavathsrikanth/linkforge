// ─── DEPRECATED ───────────────────────────────────────────────────────────────
// Upstash Redis REST does not support pub/sub subscriptions, so the old
// event-based system (publishEvent / onEvent / triggerRefresh) never worked.
// All real-time collaboration now flows through Cloudflare Durable Objects
// WebSockets (WorkspacePresence DO for presence, AnalyticsWebSocket DO for
// click streams, etc.). The Redis-based presence tracking via hash sets is
// retained as a lightweight fallback for workspace presence polling.

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
  private presenceInterval: NodeJS.Timeout | null = null;
  private currentWorkspaceId: string | null = null;
  private currentUser: { id: string; name: string; imageUrl?: string } | null = null;

  constructor() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      this.isAvailable = false;
      return;
    }

    if (!upstashUrl.startsWith("https://")) {
      this.isAvailable = false;
      return;
    }

    try {
      this.redis = new Redis({ url: upstashUrl, token: upstashToken });
      this.isAvailable = true;
    } catch {
      this.isAvailable = false;
    }
  }

  async initialize(userId: string, userName: string, imageUrl?: string) {
    this.currentUser = { id: userId, name: userName, imageUrl };
  }

  async subscribeToWorkspace(workspaceId: string) {
    if (!this.isAvailable || !this.redis) return;
    this.currentWorkspaceId = workspaceId;
    await this.startPresenceTracking(workspaceId);
  }

  async unsubscribeFromWorkspace(workspaceId: string) {
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
      console.warn("[Realtime] Failed to start presence tracking.");
    }
  }

  private async stopPresenceTracking(workspaceId: string) {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    if (this.currentUser && this.redis && this.isAvailable) {
      try { await this.redis.hdel(`presence:${workspaceId}`, this.currentUser.id); } catch { }
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
          if (now - user.lastSeen < 60000) activeUsers.push(user);
        }
      }
      return activeUsers;
    } catch {
      return [];
    }
  }

  /**
   * @deprecated Upstash Redis REST does not support pub/sub subscriptions.
   * Use the DO WebSocket system for real-time workspace events.
   * This method is a no-op kept for backward compatibility.
   */
  async publishEvent(_event: Omit<RealtimeEvent, "timestamp">) {}

  /**
   * @deprecated Upstash Redis REST does not support pub/sub subscriptions.
   * Use DO WebSocket hooks (e.g. usePresence, useLiveAnalytics) instead.
   * This method returns a no-op cleanup function.
   */
  onEvent(_workspaceId: string, _callback: (event: RealtimeEvent) => void): () => void {
    return () => {};
  }

  /**
   * @deprecated Use DO WebSocket system instead. No-op.
   */
  async triggerRefresh(_workspaceId: string, _type: RealtimeEvent["type"], _userId: string, _userName?: string) {}

  cleanup() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    this.currentWorkspaceId = null;
    this.currentUser = null;
  }
}

export const realtimeCollaboration = new RealtimeCollaboration();

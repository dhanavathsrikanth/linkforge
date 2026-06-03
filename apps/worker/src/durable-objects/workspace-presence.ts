import { DurableObject } from "cloudflare:workers";
interface PresenceState {
  userId: string;
  name: string;
  imageUrl?: string;
  page?: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

export class WorkspacePresence extends DurableObject {
  private conns: Map<string, WebSocket> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const connId = crypto.randomUUID();
      server.accept();
      this.conns.set(connId, server);

      server.addEventListener('message', async (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === 'presence') {
            server.serializeAttachment(JSON.stringify({ userId: msg.userId }));
            const key = `presence:${msg.userId}`;
            const state: PresenceState = {
              userId: msg.userId,
              name: msg.name,
              imageUrl: msg.imageUrl,
              page: msg.page,
              cursor: msg.cursor,
              lastSeen: Date.now(),
            };
            await this.ctx.storage.put(key, state);
            this.broadcast({ type: 'presence_update', userId: msg.userId, state }, connId);
          }
          if (msg.type === 'cursor') {
            const key = `presence:${msg.userId}`;
            const existing = await this.ctx.storage.get<PresenceState>(key);
            if (existing) {
              existing.cursor = msg.cursor;
              existing.lastSeen = Date.now();
              await this.ctx.storage.put(key, existing);
              this.broadcast({ type: 'cursor_move', userId: msg.userId, cursor: msg.cursor }, connId);
            }
          }
          if (msg.type === 'ping') {
            server.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {}
      });

      server.addEventListener('close', async () => {
        this.conns.delete(connId);
        const att = server.deserializeAttachment();
        if (att) {
          const { userId } = JSON.parse(att as string);
          if (userId) {
            await this.ctx.storage.delete(`presence:${userId}`);
            this.broadcast({ type: 'presence_leave', userId }, connId);
          }
        }
      });

      const allPresence: PresenceState[] = [];
      const entries = await this.ctx.storage.list<PresenceState>({ prefix: 'presence:', limit: 100 });
      for (const [, v] of entries) {
        if (Date.now() - v.lastSeen < 60000) allPresence.push(v);
      }
      server.send(JSON.stringify({ type: 'initial_state', users: allPresence }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'GET') {
      const entries = await this.ctx.storage.list<PresenceState>({ prefix: 'presence:', limit: 100 });
      const users: PresenceState[] = [];
      for (const [, v] of entries) {
        if (Date.now() - v.lastSeen < 60000) users.push(v);
      }
      return new Response(JSON.stringify({ users }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private broadcast(msg: any, excludeId?: string): void {
    const data = JSON.stringify(msg);
    const dead: string[] = [];
    for (const [id, ws] of this.conns) {
      if (id === excludeId) continue;
      try { ws.send(data); } catch { dead.push(id); }
    }
    dead.forEach((id) => this.conns.delete(id));
  }
}

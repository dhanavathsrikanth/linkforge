interface FlagDefinition {
  key: string;
  value: any;
  type: 'boolean' | 'string' | 'number' | 'json';
  description?: string;
  updatedAt: number;
}

export class FeatureFlags extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'workspaceId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const sessionId = crypto.randomUUID();
      server.accept();
      this.sessions.set(sessionId, server);

      server.addEventListener('close', () => this.sessions.delete(sessionId));

      const allFlags: Record<string, any> = {};
      const entries = await this.ctx.storage.list<FlagDefinition>({ prefix: `flag:${workspaceId}:` });
      for (const [, flag] of entries) allFlags[flag.key] = flag.value;
      server.send(JSON.stringify({ type: 'initial', flags: allFlags }));

      return new Response(null, { status: 101, webSocket: client });
    }

    const prefix = `flag:${workspaceId}:`;

    if (request.method === 'GET' && pathname.startsWith('/get/')) {
      const key = pathname.slice(5);
      const flag = await this.ctx.storage.get<FlagDefinition>(`${prefix}${key}`);
      if (!flag) return new Response(JSON.stringify({ found: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
      return new Response(JSON.stringify({ found: true, key: flag.key, value: flag.value, type: flag.type }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET' && pathname === '/all') {
      const entries = await this.ctx.storage.list<FlagDefinition>({ prefix, limit: 200 });
      const flags: Record<string, any> = {};
      for (const [, flag] of entries) flags[flag.key] = flag.value;
      return new Response(JSON.stringify(flags), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST' && pathname.startsWith('/set/')) {
      const key = pathname.slice(5);
      const { value, type, description } = await request.json<any>();
      const flag: FlagDefinition = {
        key,
        value,
        type: type || typeof value,
        description,
        updatedAt: Date.now(),
      };
      await this.ctx.storage.put(`${prefix}${key}`, flag);
      this.broadcast({ type: 'flag_update', key, value, workspaceId });
      return new Response(JSON.stringify({ set: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'DELETE' && pathname.startsWith('/delete/')) {
      const key = pathname.slice(8);
      await this.ctx.storage.delete(`${prefix}${key}`);
      this.broadcast({ type: 'flag_delete', key, workspaceId });
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST' && pathname === '/evaluate') {
      const body = await request.json<any>();
      const results: Record<string, any> = {};
      for (const key of body.flags || []) {
        const flag = await this.ctx.storage.get<FlagDefinition>(`${prefix}${key}`);
        results[key] = flag ? flag.value : undefined;
      }
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private broadcast(msg: any): void {
    const data = JSON.stringify(msg);
    const dead: string[] = [];
    for (const [id, ws] of this.sessions) {
      try { ws.send(data); } catch { dead.push(id); }
    }
    dead.forEach((id) => this.sessions.delete(id));
  }
}

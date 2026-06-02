interface SessionData {
  data: any;
  expiresAt: number;
  createdAt: number;
}

export class SessionStore extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `sess:${sessionId}`;

    if (method === 'GET') {
      const session = await this.ctx.storage.get<SessionData>(key);
      if (!session || Date.now() > session.expiresAt) {
        if (session) await this.ctx.storage.delete(key);
        return new Response(JSON.stringify({ found: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ found: true, data: session.data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT') {
      const { data, ttl } = await request.json<any>();
      const session: SessionData = {
        data,
        expiresAt: Date.now() + (ttl || 3600) * 1000,
        createdAt: Date.now(),
      };
      await this.ctx.storage.put(key, session);
      return new Response(JSON.stringify({ saved: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH') {
      const { data, ttl } = await request.json<any>();
      const session = await this.ctx.storage.get<SessionData>(key);
      if (session) {
        session.data = { ...session.data, ...data };
        if (ttl) session.expiresAt = Date.now() + ttl * 1000;
        await this.ctx.storage.put(key, session);
      }
      return new Response(JSON.stringify({ patched: !!session }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      await this.ctx.storage.delete(key);
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

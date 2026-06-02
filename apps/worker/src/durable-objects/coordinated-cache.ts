interface CacheEntry {
  value: any;
  expiresAt: number;
  staleAt: number;
}

export class CoordinatedCache extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (method === 'GET' && pathname.startsWith('/get/')) {
      const key = pathname.slice(5);
      const entry = await this.ctx.storage.get<CacheEntry>(key);
      if (!entry) {
        return new Response(JSON.stringify({ hit: false, stale: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const now = Date.now();
      if (now >= entry.expiresAt) {
        await this.ctx.storage.delete(key);
        return new Response(JSON.stringify({ hit: false, stale: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const stale = now >= entry.staleAt;
      return new Response(JSON.stringify({ hit: true, stale, value: entry.value }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT' && pathname.startsWith('/set/')) {
      const key = pathname.slice(5);
      const body = await request.json<any>();
      const ttl = body.ttl || 60;
      const staleTtl = body.staleTtl || Math.floor(ttl / 2);
      const entry: CacheEntry = {
        value: body.value,
        expiresAt: Date.now() + ttl * 1000,
        staleAt: Date.now() + staleTtl * 1000,
      };
      await this.ctx.storage.put(key, entry);
      return new Response(JSON.stringify({ cached: true, ttl }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE' && pathname.startsWith('/invalidate/')) {
      const key = pathname.slice(12);
      await this.ctx.storage.delete(key);
      return new Response(JSON.stringify({ invalidated: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && pathname === '/invalidate-by-prefix') {
      const { prefix } = await request.json<any>();
      const entries = await this.ctx.storage.list({ prefix });
      const keys = [...entries.keys()];
      await Promise.all(keys.map((k) => this.ctx.storage.delete(k)));
      return new Response(JSON.stringify({ invalidated: keys.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

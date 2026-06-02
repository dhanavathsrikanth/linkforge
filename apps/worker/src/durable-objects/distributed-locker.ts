export class DistributedLocker extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const ttl = parseInt(url.searchParams.get('ttl') || '30', 10);
    const token = url.searchParams.get('token');

    if (!key) {
      return new Response(JSON.stringify({ error: 'key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST') {
      const existing = await this.ctx.storage.get<string>(key);
      if (existing) {
        const ttlMs = parseInt(existing.split(':')[1], 10);
        if (Date.now() < ttlMs) {
          return new Response(JSON.stringify({ acquired: false, holder: existing }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      const expiry = Date.now() + ttl * 1000;
      const holder = token || crypto.randomUUID();
      await this.ctx.storage.put(key, `${holder}:${expiry}`);
      await this.ctx.storage.setAlarm(expiry);
      return new Response(JSON.stringify({ acquired: true, holder, expiresAt: expiry }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'DELETE') {
      const existing = await this.ctx.storage.get<string>(key);
      if (existing && token) {
        const holder = existing.split(':')[0];
        if (holder !== token) {
          return new Response(JSON.stringify({ error: 'not lock holder' }), { status: 403 });
        }
      }
      await this.ctx.storage.delete(key);
      return new Response(JSON.stringify({ released: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET') {
      const existing = await this.ctx.storage.get<string>(key);
      if (existing) {
        const [holder, expiryStr] = existing.split(':');
        const expired = Date.now() > parseInt(expiryStr, 10);
        return new Response(JSON.stringify({ locked: !expired, holder: expired ? null : holder }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ locked: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method Not Allowed', { status: 405 });
  }

  async alarm(): Promise<void> {
    const entries = await this.ctx.storage.list<string>({ limit: 1000 });
    const now = Date.now();
    for (const [key, value] of entries) {
      const expiry = parseInt(value.split(':')[1], 10);
      if (now >= expiry) {
        await this.ctx.storage.delete(key);
      }
    }
  }
}

interface WebhookDelivery {
  id: string;
  url: string;
  payload: any;
  headers: Record<string, string>;
  retriesLeft: number;
  maxRetries: number;
  backoffMs: number;
  status: 'queued' | 'delivering' | 'delivered' | 'failed';
  lastAttempt: number;
  nextAttempt: number;
  createdAt: number;
  responseStatus?: number;
  error?: string;
}

export class WebhookDeliverer extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'POST' && pathname === '/enqueue') {
      const body = await request.json<any>();
      const id = crypto.randomUUID();
      const delivery: WebhookDelivery = {
        id,
        url: body.url,
        payload: body.payload,
        headers: body.headers || {},
        retriesLeft: body.maxRetries ?? 3,
        maxRetries: body.maxRetries ?? 3,
        backoffMs: body.backoffMs ?? 5000,
        status: 'queued',
        lastAttempt: 0,
        nextAttempt: Date.now(),
        createdAt: Date.now(),
      };
      await this.ctx.storage.put(`wh:${id}`, delivery);
      await this.ctx.storage.put(`wh:queue:${delivery.nextAttempt}:${id}`, id);
      const currentAlarm = await this.ctx.storage.getAlarm();
      if (!currentAlarm || delivery.nextAttempt < currentAlarm) {
        await this.ctx.storage.setAlarm(delivery.nextAttempt);
      }
      return new Response(JSON.stringify({ id, queued: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET' && pathname.startsWith('/status/')) {
      const id = pathname.slice(8);
      const delivery = await this.ctx.storage.get<WebhookDelivery>(`wh:${id}`);
      if (!delivery) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(delivery), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const queued = await this.ctx.storage.list<string>({ prefix: 'wh:queue:', limit: 50 });
    const toDeliver: string[] = [];

    for (const [key, id] of queued) {
      const ts = parseInt(key.split(':')[2], 10);
      if (ts <= now) toDeliver.push(id);
    }

    for (const id of toDeliver) {
      const delivery = await this.ctx.storage.get<WebhookDelivery>(`wh:${id}`);
      if (!delivery) continue;

      delivery.status = 'delivering';
      delivery.lastAttempt = now;
      await this.ctx.storage.put(`wh:${id}`, delivery);

      try {
        const res = await fetch(delivery.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...delivery.headers },
          body: JSON.stringify(delivery.payload),
        });
        delivery.responseStatus = res.status;
        if (res.ok) {
          delivery.status = 'delivered';
          await this.ctx.storage.put(`wh:${id}`, delivery);
          await this.ctx.storage.delete(`wh:queue:${delivery.nextAttempt}:${id}`);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err: any) {
        delivery.error = err.message;
        delivery.retriesLeft--;
        if (delivery.retriesLeft > 0) {
          delivery.status = 'queued';
          delivery.backoffMs *= 2;
          delivery.nextAttempt = Date.now() + delivery.backoffMs;
          await this.ctx.storage.put(`wh:${id}`, delivery);
          await this.ctx.storage.put(`wh:queue:${delivery.nextAttempt}:${id}`, id);
        } else {
          delivery.status = 'failed';
          await this.ctx.storage.put(`wh:${id}`, delivery);
        }
      }
      await this.ctx.storage.delete(`wh:queue:${delivery.nextAttempt}:${id}`);
    }

    const remaining = await this.ctx.storage.list<string>({ prefix: 'wh:queue:', limit: 1 });
    if (remaining.size > 0) {
      const nextKey = [...remaining.keys()][0];
      const nextTs = parseInt(nextKey.split(':')[2], 10);
      await this.ctx.storage.setAlarm(nextTs);
    }
  }
}

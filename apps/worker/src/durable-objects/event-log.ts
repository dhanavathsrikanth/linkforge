import { DurableObject } from "cloudflare:workers";
interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  timestamp: number;
}

export class EventLog extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (method === 'POST' && pathname === '/append') {
      const body = await request.json<any>();
      const event: AuditEvent = {
        id: crypto.randomUUID(),
        workspaceId: body.workspaceId,
        actorId: body.actorId,
        actorName: body.actorName,
        action: body.action,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        details: body.details || {},
        timestamp: Date.now(),
      };
      const seq = await this.ctx.storage.get<number>('seq') || 0;
      const seqKey = (seq + 1).toString().padStart(12, '0');
      await this.ctx.storage.put(`log:${body.workspaceId}:${seqKey}`, event);
      await this.ctx.storage.put('seq', seq + 1);
      return new Response(JSON.stringify({ id: event.id, seq: seq + 1 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET' && pathname === '/list') {
      const workspaceId = url.searchParams.get('workspaceId');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = url.searchParams.get('offset') || '';
      if (!workspaceId) return new Response('workspaceId required', { status: 400 });

      const prefix = `log:${workspaceId}:`;
      const entries = await this.ctx.storage.list<AuditEvent>({ prefix, limit });
      const events = [...entries.values()].sort((a, b) => b.timestamp - a.timestamp);
      return new Response(JSON.stringify(events.slice(0, limit)), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET' && pathname === '/replay') {
      const workspaceId = url.searchParams.get('workspaceId');
      if (!workspaceId) return new Response('workspaceId required', { status: 400 });
      const entries = await this.ctx.storage.list<AuditEvent>({ prefix: `log:${workspaceId}:`, limit: 1000 });
      const sorted = [...entries.values()].sort((a, b) => a.timestamp - b.timestamp);
      return new Response(JSON.stringify(sorted), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

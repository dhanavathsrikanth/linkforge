import { DurableObject } from "cloudflare:workers";
export interface ScheduledTask {
  tag: string;
  action: string;
  payload: any;
  scheduledAt: number;
  executed: boolean;
}

export class Scheduler extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'POST') {
      const { tag, action, payload, scheduledAt } = await request.json<any>();
      const existing = await this.ctx.storage.get<ScheduledTask>(`task:${tag}`);
      if (existing && !existing.executed) {
        return new Response(JSON.stringify({ error: 'task already scheduled' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const task: ScheduledTask = { tag, action, payload, scheduledAt, executed: false };
      await this.ctx.storage.put(`task:${tag}`, task);
      await this.ctx.storage.put(`alarm:${scheduledAt}:${tag}`, tag);
      const currentAlarm = await this.ctx.storage.getAlarm();
      if (!currentAlarm || scheduledAt < currentAlarm) {
        await this.ctx.storage.setAlarm(scheduledAt);
      }
      return new Response(JSON.stringify({ scheduled: true, tag, at: scheduledAt }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'DELETE') {
      const tag = url.searchParams.get('tag');
      if (!tag) return new Response('tag required', { status: 400 });
      await this.ctx.storage.delete(`task:${tag}`);
      return new Response(JSON.stringify({ cancelled: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET') {
      const entries = await this.ctx.storage.list<ScheduledTask>({ prefix: 'task:' });
      const tasks = [...entries.values()];
      return new Response(JSON.stringify(tasks), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const alarms = await this.ctx.storage.list<string>({ prefix: 'alarm:' });
    const toExecute: string[] = [];

    for (const [key, tag] of alarms) {
      const ts = parseInt(key.split(':')[1], 10);
      if (ts <= now) toExecute.push(key);
    }

    for (const key of toExecute) {
      const tag = await this.ctx.storage.get<string>(key);
      if (!tag) continue;
      const task = await this.ctx.storage.get<ScheduledTask>(`task:${tag}`);
      if (task && !task.executed) {
        task.executed = true;
        await this.ctx.storage.put(`task:${tag}`, task);
        try {
          const env = this.env as any;
          await fetch(`${env.API_URL}/api/internal/scheduler/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-worker-secret': env.WORKER_SECRET },
            body: JSON.stringify({ action: task.action, payload: task.payload, tag: task.tag }),
          });
        } catch (e) {
          console.error(`[Scheduler] execute failed for ${tag}:`, e);
        }
      }
      await this.ctx.storage.delete(key);
    }

    const remaining = await this.ctx.storage.list<string>({ prefix: 'alarm:', limit: 1 });
    if (remaining.size > 0) {
      const nextKey = [...remaining.keys()][0];
      const nextTs = parseInt(nextKey.split(':')[1], 10);
      await this.ctx.storage.setAlarm(nextTs);
    }
  }
}

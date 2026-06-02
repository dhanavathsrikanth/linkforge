type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface WorkflowInstance {
  id: string;
  type: string;
  status: WorkflowStatus;
  payload: any;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
  progress: number;
}

export class WorkflowEngine extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (method === 'POST' && pathname === '/create') {
      const { type, payload } = await request.json<any>();
      const id = crypto.randomUUID();
      const workflow: WorkflowInstance = {
        id,
        type,
        status: 'pending',
        payload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        progress: 0,
      };
      await this.ctx.storage.put(`wf:${id}`, workflow);
      return new Response(JSON.stringify(workflow), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && pathname.startsWith('/transition/')) {
      const id = pathname.slice(12);
      const { event, result, error } = await request.json<any>();
      const workflow = await this.ctx.storage.get<WorkflowInstance>(`wf:${id}`);
      if (!workflow) return new Response('not found', { status: 404 });

      const transitions: Record<string, Record<string, WorkflowStatus>> = {
        pending: { start: 'running' },
        running: { complete: 'completed', fail: 'failed', cancel: 'cancelled' },
      };

      const validTransitions = transitions[workflow.status];
      if (!validTransitions || !validTransitions[event]) {
        return new Response(JSON.stringify({ error: `invalid transition ${workflow.status} -> ${event}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      workflow.status = validTransitions[event];
      workflow.updatedAt = Date.now();
      if (result) workflow.result = result;
      if (error) workflow.error = error;
      if (event === 'start') workflow.progress = 10;
      if (event === 'complete') workflow.progress = 100;

      await this.ctx.storage.put(`wf:${id}`, workflow);
      return new Response(JSON.stringify(workflow), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && pathname.startsWith('/progress/')) {
      const id = pathname.slice(10);
      const { progress } = await request.json<any>();
      const workflow = await this.ctx.storage.get<WorkflowInstance>(`wf:${id}`);
      if (!workflow) return new Response('not found', { status: 404 });
      workflow.progress = progress;
      workflow.updatedAt = Date.now();
      await this.ctx.storage.put(`wf:${id}`, workflow);
      return new Response(JSON.stringify(workflow), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET' && pathname.startsWith('/get/')) {
      const id = pathname.slice(5);
      const workflow = await this.ctx.storage.get<WorkflowInstance>(`wf:${id}`);
      if (!workflow) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(workflow), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET' && pathname === '/list') {
      const entries = await this.ctx.storage.list<WorkflowInstance>({ prefix: 'wf:', limit: 100 });
      const workflows = [...entries.values()].sort((a, b) => b.createdAt - a.createdAt);
      return new Response(JSON.stringify(workflows), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

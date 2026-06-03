import { DurableObject } from "cloudflare:workers";
interface ABTestState {
  testId: string;
  variants: Record<string, { weight: number; clicks: number; conversions: number }>;
  totalClicks: number;
  lastUpdated: number;
}

export class AbTestStream extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const sessionId = crypto.randomUUID();
      server.accept();
      this.sessions.set(sessionId, server);

      server.addEventListener('message', async (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === 'subscribe') {
            const state = await this.ctx.storage.get<ABTestState>(`ab:${msg.testId}`);
            server.send(JSON.stringify({
              type: 'initial',
              testId: msg.testId,
              state: state || { testId: msg.testId, variants: {}, totalClicks: 0, lastUpdated: Date.now() },
            }));
          }
        } catch {}
      });

      server.addEventListener('close', () => this.sessions.delete(sessionId));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (pathname === '/record' && request.method === 'POST') {
      const { testId, variantId } = await request.json<any>();
      const key = `ab:${testId}`;
      let state = await this.ctx.storage.get<ABTestState>(key);
      if (!state) {
        state = { testId, variants: {}, totalClicks: 0, lastUpdated: Date.now() };
      }
      if (!state.variants[variantId]) {
        state.variants[variantId] = { weight: 1, clicks: 0, conversions: 0 };
      }
      state.variants[variantId].clicks++;
      state.totalClicks++;
      state.lastUpdated = Date.now();
      await this.ctx.storage.put(key, state);

      const results = this.calculateProbabilities(state);
      const payload = JSON.stringify({ type: 'update', testId, state, results });
      const dead: string[] = [];
      for (const [id, ws] of this.sessions) {
        try { ws.send(payload); } catch { dead.push(id); }
      }
      dead.forEach((id) => this.sessions.delete(id));
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET') {
      const testId = url.searchParams.get('testId');
      if (!testId) return new Response('testId required', { status: 400 });
      const state = await this.ctx.storage.get<ABTestState>(`ab:${testId}`);
      if (!state) return new Response(JSON.stringify({ totalClicks: 0, variants: {}, results: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
      const results = this.calculateProbabilities(state);
      return new Response(JSON.stringify({ ...state, results }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private calculateProbabilities(state: ABTestState): Record<string, { winProb: number; conversionRate: number }> {
    const results: Record<string, { winProb: number; conversionRate: number }> = {};
    if (state.totalClicks === 0) return results;

    const variantIds = Object.keys(state.variants);
    for (const id of variantIds) {
      const v = state.variants[id];
      results[id] = {
        conversionRate: v.clicks / state.totalClicks,
        winProb: v.clicks / Math.max(1, state.totalClicks / variantIds.length),
      };
    }

    const totalProb = Object.values(results).reduce((s, r) => s + r.winProb, 0);
    if (totalProb > 0) {
      for (const id of variantIds) {
        results[id].winProb = results[id].winProb / totalProb;
      }
    }
    return results;
  }
}

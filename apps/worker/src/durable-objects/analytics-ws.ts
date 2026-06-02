export class AnalyticsWebSocket extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, server);
      server.addEventListener('close', () => this.sessions.delete(sessionId));
      server.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === 'subscribe' && msg.linkId) {
            server.send(JSON.stringify({ type: 'subscribed', linkId: msg.linkId }));
          }
        } catch {}
      });
      server.send(JSON.stringify({ type: 'connected', sessionId }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (pathname === '/push' && request.method === 'POST') {
      const data = await request.json<any>();
      const dead: string[] = [];
      for (const [id, ws] of this.sessions) {
        try {
          ws.send(JSON.stringify({ type: 'click', data }));
        } catch {
          dead.push(id);
        }
      }
      dead.forEach((id) => this.sessions.delete(id));
      return new Response(JSON.stringify({ pushed: this.sessions.size }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

import { DurableObject } from "cloudflare:workers";
export class QrStream extends DurableObject {
  private sessions: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const sessionId = crypto.randomUUID();
      server.accept();
      this.sessions.set(sessionId, server);

      server.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === 'subscribe' && msg.qrId) {
            if (!this.subscriptions.has(msg.qrId)) {
              this.subscriptions.set(msg.qrId, new Set());
            }
            this.subscriptions.get(msg.qrId)!.add(sessionId);
            server.send(JSON.stringify({ type: 'subscribed', qrId: msg.qrId }));
          }
          if (msg.type === 'unsubscribe' && msg.qrId) {
            this.subscriptions.get(msg.qrId)?.delete(sessionId);
          }
        } catch {}
      });

      server.addEventListener('close', () => {
        this.sessions.delete(sessionId);
        for (const [, subs] of this.subscriptions) subs.delete(sessionId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/push-scan' && request.method === 'POST') {
      const { qrId, scanData } = await request.json<any>();
      const payload = JSON.stringify({ type: 'scan', qrId, data: scanData, timestamp: Date.now() });
      const subs = this.subscriptions.get(qrId);
      if (subs) {
        const dead: string[] = [];
        for (const sessionId of subs) {
          const ws = this.sessions.get(sessionId);
          if (ws) { try { ws.send(payload); } catch { dead.push(sessionId); } }
        }
        dead.forEach((id) => {
          subs.delete(id);
          this.sessions.delete(id);
        });
      }
      return new Response(JSON.stringify({ pushed: subs?.size || 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

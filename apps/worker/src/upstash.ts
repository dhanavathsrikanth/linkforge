/**
 * Minimal Upstash Redis REST client.
 * Uses fetch() — works in Cloudflare Workers with no npm deps.
 */

interface UpstashResult {
  result: unknown;
  error?: string;
}

export class UpstashRedis {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async send(command: string[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as UpstashResult;
    if (data.error) throw new Error(`Upstash error: ${data.error}`);
    return data.result;
  }

  async pipeline(commands: string[][]): Promise<unknown[]> {
    if (commands.length === 0) return [];
    const res = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash pipeline error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as UpstashResult[];
    return data.map((d) => {
      if (d.error) throw new Error(`Upstash pipeline error: ${d.error}`);
      return d.result;
    });
  }

  incr(key: string) {
    return this.send(['INCR', key]);
  }

  lpush(key: string, value: string) {
    return this.send(['LPUSH', key, value]);
  }

  ltrim(key: string, start: number, end: number) {
    return this.send(['LTRIM', key, String(start), String(end)]);
  }

  expire(key: string, ttl: number) {
    return this.send(['EXPIRE', key, String(ttl)]);
  }
}

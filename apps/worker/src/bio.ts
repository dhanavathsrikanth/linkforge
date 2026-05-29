/**
 * Bio page handler for the Cloudflare Worker.
 *
 * Responsibilities:
 *  1. Route custom domains → slug via KV lookup
 *  2. Bot detection — skip analytics for crawlers
 *  3. Rate limiting for POST /api/bio/reactions (KV counter, 16/hr per IP)
 *  4. HTML cache — serve from KV, fall back to Next.js origin (60s TTL)
 *  5. OG image cache — serve from KV, fall back to origin (1h TTL)
 *  6. Analytics event buffering — non-blocking ctx.waitUntil
 *  7. Unique visitor dedup — KV flag per ipHash (24h TTL)
 *
 * DB: Never. The worker only touches KV.
 * Neon Postgres is owned exclusively by Next.js.
 */

import type { Env, BioPageEvent, BioDomainMapping } from './types';

// ─── Bot patterns ─────────────────────────────────────────────────────────────

const BOT_UA_PATTERNS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'applebot', 'semrushbot', 'ahrefsbot',
  'mj12bot', 'dotbot', 'rogerbot', 'exabot', 'ia_archiver',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some((p) => ua.includes(p));
}

// ─── Device detection ─────────────────────────────────────────────────────────

function detectDevice(ua: string): 'mobile' | 'desktop' | 'tablet' | 'bot' {
  const u = ua.toLowerCase();
  if (isBot(u)) return 'bot';
  if (u.includes('ipad') || (u.includes('android') && !u.includes('mobile'))) return 'tablet';
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone') || u.includes('ipod')) return 'mobile';
  return 'desktop';
}

// ─── Browser / OS detection ───────────────────────────────────────────────────

function detectBrowser(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes('edg/')) return 'edge';
  if (u.includes('opr/') || u.includes('opera')) return 'opera';
  if (u.includes('chrome') && !u.includes('edg')) return 'chrome';
  if (u.includes('firefox')) return 'firefox';
  if (u.includes('safari') && !u.includes('chrome')) return 'safari';
  return 'other';
}

function detectOs(ua: string): string {
  const u = ua.toLowerCase();
  if (u.includes('windows')) return 'windows';
  if (u.includes('android')) return 'android';
  if (u.includes('iphone') || u.includes('ipad') || u.includes('ipod')) return 'ios';
  if (u.includes('mac os')) return 'macos';
  if (u.includes('linux')) return 'linux';
  return 'other';
}

// ─── IP hashing ───────────────────────────────────────────────────────────────

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Analytics buffering ──────────────────────────────────────────────────────

/**
 * Buffer a page view event in KV.
 * The hourly GitHub Actions cron calls /api/internal/bio-events to flush
 * these into Neon Postgres (link_gallery_block_events).
 *
 * KV keys:
 *   bio:views:{galleryId}:{YYYY-MM-DD}   → integer (total views today)
 *   bio:unique:{galleryId}:{ipHash}       → "1" (24h TTL — unique visitor flag)
 *   bio:events:{galleryId}               → JSON array of BioPageEvent (max 500)
 */
async function bufferAnalyticsEvent(
  env: Env,
  galleryId: string,
  event: BioPageEvent,
): Promise<void> {
  const date = event.ts.slice(0, 10); // YYYY-MM-DD

  // Increment daily view counter
  const viewKey = `bio:views:${galleryId}:${date}`;
  const currentViews = parseInt((await env.BIO_ANALYTICS_KV.get(viewKey)) ?? '0', 10);
  await env.BIO_ANALYTICS_KV.put(viewKey, String(currentViews + 1), {
    // Keep for 8 days so the flush cron can always read yesterday's data
    expirationTtl: 8 * 24 * 60 * 60,
  });

  // Append event to the rolling event list (capped at 500 per gallery)
  const eventsKey = `bio:events:${galleryId}`;
  const existing = await env.BIO_ANALYTICS_KV.get(eventsKey);
  const events: BioPageEvent[] = existing ? JSON.parse(existing) : [];
  events.push(event);
  // Keep only the last 500 events to avoid KV value size limits (25 MB)
  const trimmed = events.slice(-500);
  await env.BIO_ANALYTICS_KV.put(eventsKey, JSON.stringify(trimmed), {
    expirationTtl: 8 * 24 * 60 * 60,
  });
}

// ─── Rate limiting (reactions) ────────────────────────────────────────────────

/**
 * Rate limit POST /api/bio/reactions at the edge.
 * Uses KV counter: bio:rl:reactions:{ipHash} → count (TTL: 1h)
 * Limit: 16 reactions per IP per hour (matches the per-block UI cap).
 */
async function checkReactionRateLimit(
  env: Env,
  ipHash: string,
): Promise<boolean> {
  const key = `bio:rl:reactions:${ipHash}`;
  const current = parseInt((await env.BIO_ANALYTICS_KV.get(key)) ?? '0', 10);
  if (current >= 16) return false; // over limit
  await env.BIO_ANALYTICS_KV.put(key, String(current + 1), { expirationTtl: 3600 });
  return true;
}

// ─── HTML cache ───────────────────────────────────────────────────────────────

/**
 * Serve a bio page from KV cache or fall back to Next.js origin.
 * Cache TTL: 60 seconds (matches Next.js ISR revalidate).
 * Cache is purged immediately when the user saves via PATCH /api/gallery.
 */
async function serveBioPage(
  slug: string,
  galleryId: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  device: 'mobile' | 'desktop' | 'tablet' | 'bot',
): Promise<Response> {
  const cacheKey = `bio:html:${slug}`;

  // Try KV cache first
  const cached = await env.BIO_PAGES_KV.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      },
    });
  }

  // Cache miss — fetch from Next.js origin
  const originUrl = new URL(request.url);
  originUrl.hostname = new URL(env.API_URL).hostname;
  originUrl.pathname = `/p/${slug}`;

  const originReq = new Request(originUrl.toString(), {
    headers: {
      ...Object.fromEntries(request.headers),
      // Pass device type so Next.js can choose the right grid layout for SSR
      'X-Device-Type': device,
      // Pass full CF geo data
      'X-CF-Country': (request as any).cf?.country ?? '',
      'X-CF-City': (request as any).cf?.city ?? '',
      'X-CF-Region': (request as any).cf?.region ?? '',
      'X-CF-Latitude': (request as any).cf?.latitude ?? '',
      'X-CF-Longitude': (request as any).cf?.longitude ?? '',
    },
  });

  const originRes = await fetch(originReq);

  if (originRes.ok) {
    const html = await originRes.text();
    // Cache in KV for 60s (non-blocking)
    ctx.waitUntil(
      env.BIO_PAGES_KV.put(cacheKey, html, { expirationTtl: 60 })
    );
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      },
    });
  }

  // Origin returned non-200 — pass through as-is
  return originRes;
}

// ─── OG image cache ───────────────────────────────────────────────────────────

async function serveOgImage(
  slug: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const cacheKey = `bio:og:${slug}`;

  const cached = await env.BIO_PAGES_KV.get(cacheKey, 'arrayBuffer');
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT',
      },
    });
  }

  const originUrl = `${env.API_URL}/p/${slug}/opengraph-image`;
  const originRes = await fetch(originUrl);

  if (originRes.ok) {
    const buf = await originRes.arrayBuffer();
    ctx.waitUntil(
      env.BIO_PAGES_KV.put(cacheKey, buf, { expirationTtl: 3600 })
    );
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS',
      },
    });
  }

  return originRes;
}

// ─── Main bio request handler ─────────────────────────────────────────────────

export async function handleBioRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  const host = request.headers.get('Host') ?? '';
  const pathname = url.pathname;
  const method = request.method;

  // ── Determine slug ──────────────────────────────────────────────────────────

  let slug: string | null = null;
  let galleryId: string | null = null;

  const isPivotUrlDomain = host === 'pivoturl.com' || host.endsWith('.pivoturl.com');

  if (isPivotUrlDomain && pathname.startsWith('/p/')) {
    // Standard route: pivoturl.com/p/{slug}
    slug = pathname.slice(3).split('/')[0] || null;
  } else if (!isPivotUrlDomain) {
    // Custom domain: look up domain→slug mapping in KV
    const mapping = await env.BIO_PAGES_KV.get(`bio:domain:${host}`);
    if (mapping) {
      const parsed: BioDomainMapping = JSON.parse(mapping);
      slug = parsed.slug;
      galleryId = parsed.galleryId;
    }
  }

  // Not a bio request — let the link redirect handler take over
  if (!slug) return null;

  // ── OG image ────────────────────────────────────────────────────────────────

  if (pathname.endsWith('/opengraph-image')) {
    return serveOgImage(slug, request, env, ctx);
  }

  // ── Reaction rate limiting (edge, before hitting Next.js) ───────────────────

  if (method === 'POST' && pathname === '/api/bio/reactions') {
    const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
    const ipHash = await hashIP(ip);
    const allowed = await checkReactionRateLimit(env, ipHash);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many reactions' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '3600',
        },
      });
    }
    // Allowed — forward to Next.js
    return null;
  }

  // ── Serve bio page HTML ─────────────────────────────────────────────────────

  const ua = request.headers.get('User-Agent') ?? '';
  const device = detectDevice(ua);

  // Analytics (non-blocking, skip bots)
  if (device !== 'bot') {
    const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
    const ipHash = await hashIP(ip);

    // Unique visitor check (24h window)
    const uniqueKey = `bio:unique:${slug}:${ipHash}`;
    const existingUnique = await env.BIO_ANALYTICS_KV.get(uniqueKey);
    const isUnique = !existingUnique;
    if (isUnique) {
      ctx.waitUntil(
        env.BIO_ANALYTICS_KV.put(uniqueKey, '1', { expirationTtl: 86400 })
      );
    }

    const cf = (request as any).cf ?? {};
    const event: BioPageEvent = {
      ts: new Date().toISOString(),
      country: cf.country ?? 'XX',
      city: cf.city ?? '',
      region: cf.region ?? '',
      lat: cf.latitude,
      lon: cf.longitude,
      device,
      browser: detectBrowser(ua),
      os: detectOs(ua),
      referrer: request.headers.get('Referer') ?? undefined,
      ipHash,
      isUnique,
    };

    // galleryId may be null for pivoturl.com/p/{slug} — the flush endpoint
    // will resolve it from the slug. For custom domains it's already known.
    const bufferKey = galleryId ?? `slug:${slug}`;
    ctx.waitUntil(bufferAnalyticsEvent(env, bufferKey, event));
  }

  return serveBioPage(slug, galleryId ?? '', request, env, ctx, device);
}

// ─── Cache purge handler ──────────────────────────────────────────────────────

/**
 * Called by Next.js PATCH /api/gallery after a save to invalidate the
 * cached HTML for the affected slug.
 *
 * POST /internal/bio/purge
 * Headers: x-worker-secret: <WORKER_SECRET>
 * Body: { slug: string, oldSlug?: string }
 */
export async function handleBioPurge(
  request: Request,
  env: Env,
): Promise<Response> {
  const secret = request.headers.get('x-worker-secret');
  if (!secret || secret !== env.WORKER_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { slug, oldSlug } = await request.json() as { slug: string; oldSlug?: string };

    const keysToDelete = [
      `bio:html:${slug}`,
      `bio:og:${slug}`,
    ];
    if (oldSlug && oldSlug !== slug) {
      keysToDelete.push(`bio:html:${oldSlug}`, `bio:og:${oldSlug}`);
    }

    await Promise.all(keysToDelete.map((k) => env.BIO_PAGES_KV.delete(k)));

    return new Response(JSON.stringify({ purged: keysToDelete }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
}

// ─── Domain mapping handler ───────────────────────────────────────────────────

/**
 * Called by Next.js when a user sets/removes a custom domain on their bio page.
 *
 * POST /internal/bio/domain-mapping
 * Headers: x-worker-secret: <WORKER_SECRET>
 * Body: { domain: string, slug: string, galleryId: string } | { domain: string, remove: true }
 */
export async function handleBioDomainMapping(
  request: Request,
  env: Env,
): Promise<Response> {
  const secret = request.headers.get('x-worker-secret');
  if (!secret || secret !== env.WORKER_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json() as
      | { domain: string; slug: string; galleryId: string }
      | { domain: string; remove: true };

    const kvKey = `bio:domain:${body.domain}`;

    if ('remove' in body && body.remove) {
      await env.BIO_PAGES_KV.delete(kvKey);
    } else if ('slug' in body) {
      const mapping: BioDomainMapping = { slug: body.slug, galleryId: body.galleryId };
      await env.BIO_PAGES_KV.put(kvKey, JSON.stringify(mapping));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
}

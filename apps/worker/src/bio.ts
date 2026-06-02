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

import type { Env, BioPageEvent, BioDomainMapping, BioEventQueueMessage } from './types';

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
 * Send a page view event to Cloudflare Queue for processing.
 * The queue consumer writes to Upstash Redis (view counters + event log).
 */
async function queueAnalyticsEvent(
  env: Env,
  galleryId: string,
  slug: string,
  event: BioPageEvent,
): Promise<void> {
  const msg: BioEventQueueMessage = {
    type: 'bio-view',
    galleryId,
    slug,
    ts: event.ts,
    country: event.country,
    city: event.city,
    region: event.region,
    device: event.device,
    browser: event.browser,
    os: event.os,
    referrer: event.referrer,
    ipHash: event.ipHash,
    isUnique: event.isUnique,
  };
  await env.BIO_EVENT_QUEUE.send(msg);
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

  // Check KV — permanent storage (no expiration)
  // OG images are pre-generated at publish time or cached on first request.
  // Invalidated only when the page is re-published.
  const cached = await env.BIO_PAGES_KV.get(cacheKey, 'arrayBuffer');
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, s-maxage=86400',
        'X-Cache': 'HIT',
      },
    });
  }

  // KV miss — fetch from Next.js origin (edge runtime, publishedSnapshot read)
  const originUrl = `${env.API_URL}/p/${slug}/opengraph-image`;
  const originRes = await fetch(originUrl);

  if (originRes.ok) {
    const buf = await originRes.arrayBuffer();
    // Store permanently in KV — only purged on re-publish
    ctx.waitUntil(
      env.BIO_PAGES_KV.put(cacheKey, buf)
    );
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, s-maxage=86400',
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

    // Use the galleryId if known, otherwise resolve from slug in the queue consumer
    const eventGalleryId = galleryId ?? `slug:${slug}`;
    ctx.waitUntil(queueAnalyticsEvent(env, eventGalleryId, slug, event));
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

// ─── OG image pre-generation ──────────────────────────────────────────────────

/**
 * Called by Next.js after publishing a bio page to pre-generate and store
 * the OG image in KV. This eliminates the first Vercel function invocation
 * when a crawler requests the OG image.
 *
 * POST /internal/bio/og-pregenerate
 * Headers: x-worker-secret: <WORKER_SECRET>, Content-Type: image/png
 * Body: PNG image binary
 * Query: ?slug=<slug>
 */
export async function handleOgPregenerate(
  request: Request,
  env: Env,
): Promise<Response> {
  const secret = request.headers.get('x-worker-secret');
  if (!secret || secret !== env.WORKER_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response('Missing slug query parameter', { status: 400 });
    }

    const contentType = request.headers.get('Content-Type');
    if (contentType !== 'image/png') {
      return new Response('Content-Type must be image/png', { status: 400 });
    }

    const pngBuffer = await request.arrayBuffer();
    if (pngBuffer.byteLength === 0 || pngBuffer.byteLength > 2 * 1024 * 1024) {
      return new Response('Invalid PNG size (must be 0-2MB)', { status: 400 });
    }

    // Store permanently in KV — only purged on re-publish
    const cacheKey = `bio:og:${slug}`;
    await env.BIO_PAGES_KV.put(cacheKey, pngBuffer);

    return new Response(
      JSON.stringify({ ok: true, key: cacheKey, size: pngBuffer.byteLength }),
      { headers: { 'Content-Type': 'application/json' } }
    );
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

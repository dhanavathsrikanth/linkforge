import type { Env, Link, RequestContext, ClickQueueMessage, DomainConfig } from './types';
import { handleBioRequest, handleBioPurge, handleBioDomainMapping, handleOgPregenerate } from './bio';
import { resolveRoute, isSystemPath } from './domain-routing';
import { handleQueue } from './queue-handler';
import { checkRateLimitEdge } from './rate-limiter';
import { handlePasswordChallenge, handlePasswordVerify } from './password-challenge';


// ─── Suspended-domain page ────────────────────────────────────────────────────

function suspendedPage(httpStatus: 503 | 410): Response {
  const billing = httpStatus === 503;
  const body = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<title>Domain temporarily unavailable</title></head>` +
    `<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;` +
    `background:#09090b;color:#fff;display:flex;align-items:center;justify-content:center;` +
    `min-height:100vh;margin:0;text-align:center"><div><h1 style="margin:0 0 .5rem">` +
    `Temporarily unavailable</h1><p style="color:#a1a1aa">` +
    (billing
      ? 'This domain is paused. The workspace owner needs to update their billing.'
      : 'This domain has been disabled.') +
    `</p></div></body></html>`;
  return new Response(body, {
    status: httpStatus,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function getDomainConfig(host: string, env: Env): Promise<DomainConfig | null> {
  const key = `domain:${host}`;
  const cached = await env.BIO_PAGES_KV.get(key);
  if (cached) {
    try { return JSON.parse(cached) as DomainConfig; } catch { /* fall through */ }
  }
  try {
    const res = await fetch(
      `${env.API_URL}/api/internal/domain-resolve?host=${encodeURIComponent(host)}`,
      { headers: { 'x-worker-secret': env.WORKER_SECRET } }
    );
    if (res.ok) {
      const cfg = (await res.json()) as DomainConfig | null;
      if (cfg) {
        await env.BIO_PAGES_KV.put(key, JSON.stringify(cfg), { expirationTtl: 60 });
        return cfg;
      }
    }
  } catch {
    /* network/origin error — treat as no-config, legacy fallback */
  }
  return null;
}

// ─── 404 page ─────────────────────────────────────────────────────────────────

const NOT_FOUND_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found | PivotUrl</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #09090b;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container { text-align: center; padding: 2rem; }
    .logo {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #433BFF 0%, #DEDCFF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1rem;
    }
    h1 { color: #ffffff; font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; margin-bottom: 2rem; }
    .cta-button {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: linear-gradient(135deg, #433BFF 0%, #3730E6 100%);
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(67, 59, 255, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⬡ PivotUrl</div>
    <h1>Link not found</h1>
    <p>This link doesn't exist or has been deleted.</p>
    <a href="https://pivoturl.com" class="cta-button">Shorten your own links free →</a>
  </div>
</body>
</html>`;

// ─── Helpers ───────────────────────────────────────────────────────

/** Forward request to Vercel with the original Host set as X-Forwarded-Host
 *  so Clerk middleware uses the correct domain (pivoturl.com) for redirect URLs
 *  instead of the Vercel preview URL. */
async function proxyToVercel(pathname: string, search: string): Promise<Response> {
  const originUrl = `https://pivoturl.vercel.app${pathname}${search}`;
  const originRes = await fetch(originUrl, { method: 'GET', redirect: 'manual' });
  const status = originRes.status;
  if ((status >= 200 && status < 300) || status === 404 || status === 304) {
    const body = await originRes.text();
    const originType = originRes.headers.get('Content-Type') ?? 'text/html; charset=utf-8';
    return new Response(body, {
      status,
      headers: {
        'Content-Type': originType,
        'Cache-Control': 'public, max-age=300, s-maxage=60',
      },
    });
  }
  return new Response(NOT_FOUND_PAGE, {
    status: 502,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function proxyAuthenticatedRequest(pathname: string, search: string, request: Request, host: string): Promise<Response> {
  const originUrl = `https://pivoturl.vercel.app${pathname}${search}`;
  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', host);
  return fetch(new Request(originUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  }), { redirect: 'manual' });
}

function isPivotUrlHost(host: string): boolean {
  return host === 'pivoturl.com' || host.endsWith('.pivoturl.com');
}

function detectDevice(userAgent: string): 'mobile' | 'desktop' | 'tablet' | 'bot' {
  const ua = userAgent.toLowerCase();
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot', 'semrushbot',
  ];
  if (botPatterns.some((bot) => ua.includes(bot))) return 'bot';
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) return 'tablet';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) return 'mobile';
  return 'desktop';
}

function parseUserAgent(userAgent: string): { browser?: string; os?: string } {
  const ua = userAgent.toLowerCase();
  let browser: string | undefined;
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('edg')) browser = 'edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'opera';
  let os: string | undefined;
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';
  return { browser, os };
}

function resolveDestination(
  link: Link,
  context: RequestContext,
): { destination: string; variant?: string } {
  const { device, country, language } = context;
  if (link.routingRules && link.routingRules.length > 0) {
    for (const rule of link.routingRules) {
      const { condition, destination } = rule;
      let matches = true;
      if (condition.device && condition.device !== device) matches = false;
      if (condition.country && condition.country.toUpperCase() !== country.toUpperCase()) matches = false;
      if (condition.language && !language.toLowerCase().startsWith(condition.language.toLowerCase())) matches = false;
      if (matches) return { destination };
    }
  }
  if (link.abTestEnabled && link.abVariants && link.abVariants.length > 0) {
    const totalWeight = link.abVariants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    for (const variant of link.abVariants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) return { destination: variant.destination, variant: variant.id };
    }
  }
  return { destination: link.destination };
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function writeClickAnalyticsEngine(
  env: Env,
  link: Link,
  context: RequestContext,
  browser: string | undefined,
  os: string | undefined,
  referrer: string | null,
  variant?: string,
): Promise<void> {
  env.ANALYTICS_ENGINE.writeDataPoint({
    indexes: [
      link.id,             // linkId
      link.workspaceId,    // workspaceId
      link.slug,           // slug
      context.device,       // device
      context.country,      // country
    ],
    doubles: [
      Date.now(),          // timestamp
      context.isUnique ? 1 : 0,  // isUnique (for SUM aggregation)
    ],
    blobs: [
      browser ?? '',   // max 30 bytes
      os ?? '',
      (referrer ? extractDomain(referrer) ?? '' : '').slice(0, 30),
      variant ?? '',
      context.country,
    ],
  });
}

async function queueClick(
  env: Env,
  link: Link,
  context: RequestContext,
  userAgent: string,
  referrer: string | null,
  variant?: string,
  url?: URL,
): Promise<void> {
  const { browser, os } = parseUserAgent(userAgent);

  // Write to Analytics Engine (primary analytics pipeline — always succeeds)
  writeClickAnalyticsEngine(env, link, context, browser, os, referrer, variant);

  // Detect click-source flags from the short URL query string. QR codes embed
  // `?source=qr` and deep links embed `?deep=1`, so we can attribute scans
  // and platform-specific opens to the right bucket. We previously hard-coded
  // these to false, which made the per-QR analytics card show 0 scans even
  // for links that were clearly being scanned.
  const isQrScan = url?.searchParams.get("source") === "qr";
  const isDeepLink = url?.searchParams.get("deep") === "1";

  // Queue for Redis real-time feed + billing/webhooks side-effects
  const msg: ClickQueueMessage = {
    type: 'click',
    linkId: link.id,
    slug: link.slug,
    destination: link.destination,
    device: context.device,
    browser,
    os,
    country: context.country,
    city: context.city,
    region: context.region,
    ipHash: context.ipHash,
    isUnique: context.isUnique,
    language: context.language,
    referrer: referrer || undefined,
    referrerDomain: referrer ? extractDomain(referrer) : undefined,
    variant,
    isQrScan,
    isDeepLink,
    timestamp: Date.now(),
  };
  await env.CLICK_QUEUE.send(msg);
}

function extractDomain(url: string): string | undefined {
  try { return new URL(url).hostname; } catch { return undefined; }
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    await handleQueue(batch as MessageBatch<any>, env);
  },

  // ─── Cron Trigger Handlers ────────────────────────────────────────────────
  // Replaces GitHub Actions cron jobs with Workers Cron Triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;
    console.log(`[cron] Triggered: ${cron}`);

    try {
      if (cron === "0 4 * * *") {
        // Daily at 04:00 UTC - domain status sync
        await handleDomainStatusSync(env);
      } else if (cron === "0 * * * *") {
        // Hourly - URL scanner rescan
        await handleUrlScannerRescan(env);
      } else if (cron === "0 3 * * *") {
        // Daily at 03:00 UTC - URL scanner retention
        await handleUrlScannerRetention(env);
      }
    } catch (err) {
      console.error("[cron] Error:", err);
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
    const url = new URL(request.url);
    const host = request.headers.get('Host') || '';
    const pathname = url.pathname;

    // ── Durable Object routing ─────────────────────────────────────────────────
    // Route /do/{name}/{id}/{action} to the corresponding DO namespace.
    // Handles WebSocket upgrades and HTTP requests for all 12 DO classes.
    if (pathname.startsWith('/do/')) {
      const parts = pathname.split('/');
      const doName = parts[2];
      const doId = parts[3] || 'default';
      const routeBindings: Record<string, DurableObjectNamespace> = {
        'analytics-ws': env.ANALYTICS_WS,
        'presence': env.WORKSPACE_PRESENCE,
        'qr': env.QR_STREAM,
        'abtest': env.AB_TEST_STREAM,
        'locker': env.DISTRIBUTED_LOCKER,
        'scheduler': env.SCHEDULER,
        'cache': env.COORDINATED_CACHE,
        'workflow': env.WORKFLOW_ENGINE,
        'webhook': env.WEBHOOK_DELIVERER,
        'session': env.SESSION_STORE,
        'event-log': env.EVENT_LOG,
        'feature-flags': env.FEATURE_FLAGS,
      };
      const ns = routeBindings[doName];
      if (ns) {
        const stub = ns.idFromName(doId);
        return ns.get(stub).fetch(request);
      }
    }

    // ── Password challenge routes ─────────────────────────────────────────────
    // Serve password challenge and verification at edge for performance
    if (pathname.startsWith('/internal/challenge/')) {
      const slug = pathname.split('/')[3];
      if (slug) {
        return handlePasswordChallenge(request, env, slug, host);
      }
    }

    if (pathname === '/internal/verify-password' && request.method === 'POST') {
      const body = await request.json() as { slug: string };
      if (body.slug) {
        return handlePasswordVerify(request, env, body.slug);
      }
    }

    // ── Edge rate limiting ─────────────────────────────────────────────────────
    // Enforced at Cloudflare edge before requests reach Vercel.
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = `${clientIp}:${pathname}`;

    // Public API: 100 req/min per IP (matches free-plan rate limit)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/internal/')) {
      const rl = checkRateLimitEdge(rlKey, 100, 60_000);
      if (!rl.allowed) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
            },
          },
        );
      }
    }

    // ── Edge API key validation ───────────────────────────────────────────────
    // Validate API keys at edge using KV cache before requests reach Vercel.
    const authHeader = request.headers.get('authorization') || '';
    if (pathname.startsWith('/api/') && authHeader.startsWith('Bearer lf_')) {
      const token = authHeader.slice(7).trim();
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const cacheKey = `apikey:${hash}`;
      let keyData: { active: boolean; expiresAt: string | null; keyType: string; workspaceId: string } | null = null;
      try {
        const raw = await env.LINKS_KV.get(cacheKey);
        if (raw) keyData = JSON.parse(raw);
      } catch { /* KV read failed — pass through to Vercel */ }
      if (keyData && (!keyData.active || (keyData.expiresAt && Date.now() > new Date(keyData.expiresAt).getTime()))) {
        return new Response(
          JSON.stringify({ error: { code: 'UNAUTHORIZED', message: keyData.active ? 'API key has expired.' : 'API key has been revoked.' } }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Passthrough for Next.js API routes ───────────────────────────────────
    // Forward to Vercel origin directly to avoid circular worker invocation.
    if (pathname.startsWith('/api/')) {
      return proxyAuthenticatedRequest(pathname, url.search, request, host);
    }

    // ── Internal worker management endpoints ──────────────────────────────────
    // These have their own stricter rate limits.

    if (pathname === '/internal/bio/purge' && request.method === 'POST') {
      return handleBioPurge(request, env);
    }

    if (pathname === '/internal/bio/domain-mapping' && request.method === 'POST') {
      return handleBioDomainMapping(request, env);
    }

    if (pathname === '/internal/bio/og-pregenerate' && request.method === 'POST') {
      return handleOgPregenerate(request, env);
    }

    if (pathname === '/internal/click' && request.method === 'POST') {
      const rl = checkRateLimitEdge(`${clientIp}:/internal/click`, 100, 60_000);
      if (!rl.allowed) {
        return new Response('Rate limited', { status: 429 });
      }
      try {
        const body = await request.json() as {
          linkId: string; workspaceId: string; slug: string;
          device: string; browser: string; os: string;
          country: string; city?: string; region?: string;
          referrerDomain?: string; ipHash: string; isUnique: boolean;
          isQrScan: boolean; isDeepLink: boolean; abVariant?: string;
          timestamp: number;
        };
        env.ANALYTICS_ENGINE.writeDataPoint({
          indexes: [body.linkId, body.workspaceId, body.slug, body.device, body.country],
          doubles: [body.timestamp, body.isUnique ? 1 : 0],
          blobs: [
            (body.browser ?? '').slice(0, 30),
            (body.os ?? '').slice(0, 30),
            (body.referrerDomain ?? '').slice(0, 30),
            (body.abVariant ?? '').slice(0, 30),
          ],
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response('Bad Request', { status: 400 });
      }
    }

    if (pathname === '/internal/domain-config' && request.method === 'POST') {
      const secret = request.headers.get('x-worker-secret');
      if (!secret || secret !== env.WORKER_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
      try {
        const body = (await request.json()) as
          | { host: string; config: DomainConfig }
          | { host: string; remove: true };
        const key = `domain:${body.host}`;
        if ('remove' in body && body.remove) {
          await env.BIO_PAGES_KV.delete(key);
        } else if ('config' in body) {
          await env.BIO_PAGES_KV.put(key, JSON.stringify(body.config));
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response('Bad Request', { status: 400 });
      }
    }

    if (pathname === '/internal/api-key-sync' && request.method === 'POST') {
      const secret = request.headers.get('x-worker-secret');
      if (!secret || secret !== env.WORKER_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
      try {
        const body = (await request.json()) as
          | { keyHash: string; active: boolean; expiresAt: string | null; keyType: string; workspaceId: string }
          | { keyHash: string; remove: true };
        const cacheKey = `apikey:${body.keyHash}`;
        if ('remove' in body && body.remove) {
          await env.LINKS_KV.delete(cacheKey);
        } else if ('keyHash' in body) {
          const { keyHash, ...data } = body as any;
          await env.LINKS_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 900 });
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response('Bad Request', { status: 400 });
      }
    }

    // ── Next.js app routes passthrough ──────────────────────────────────────────
    // Proxy dashboard, auth, static assets, and other Next.js routes to Vercel
    // BEFORE the short-link slug lookup to avoid unnecessary KV misses.
    // Preserves original cookies/headers so user session works on dashboard pages.
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/dashboard/') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/challenge/') ||
      pathname.startsWith('/docs') ||
      pathname.startsWith('/pricing')
    ) {
      return proxyAuthenticatedRequest(pathname, url.search, request, host);
    }

    // ── Custom-domain routing ─────────────────────────────────────────────────
    {
      const isPivotUrl = isPivotUrlHost(host);
      if (!isPivotUrl) {
        const cfg = await getDomainConfig(host, env);
        if (cfg) {
          const route = resolveRoute(cfg, pathname);
          switch (route.kind) {
            case 'suspended':
              return suspendedPage(route.httpStatus);
            case 'system-passthrough':
              return fetch(request);
            case 'root-redirect':
              return Response.redirect(route.url, 302);
            case 'root-bio': {
              const bioResponse = await handleBioRequest(request, env, ctx);
              if (bioResponse) return bioResponse;
              return new Response(NOT_FOUND_PAGE, {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            }
            case 'link':
              break;
            case 'not-found':
              return new Response(NOT_FOUND_PAGE, {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
          }
        }
      }
    }

    // ── Bio page routing ──────────────────────────────────────────────────────

    const isPivotUrlDomain = isPivotUrlHost(host);
    const isBioPath = pathname.startsWith('/p/');
    const isReactionPost = request.method === 'POST' && pathname === '/api/bio/reactions';
    const isCustomDomain = !isPivotUrlDomain;

    if (isBioPath || isCustomDomain || isReactionPost) {
      const bioResponse = await handleBioRequest(request, env, ctx);
      if (bioResponse) return bioResponse;
    }

    // ── Root path — proxy to Next.js origin for marketing landing page ────────
    // Uses minimal headers — no Cookie, no browser User-Agent — so Vercel sees
    // a clean request and doesn't redirect to Clerk or other auth flows.

    if (pathname === '/') {
      return proxyToVercel('/', url.search);
    }

    // ── Short link redirect ───────────────────────────────────────────────────

    const domain = host;
    const slug = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    const hostIsPivotUrl = isPivotUrlHost(host);

    if (!slug) {
      if (hostIsPivotUrl) {
        return proxyAuthenticatedRequest(pathname, url.search, request, host);
      }
      return new Response(NOT_FOUND_PAGE, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const cacheKey = `${domain}:${slug}`;

    try {
      let link: Link | null = await env.LINKS_KV.get(cacheKey, 'json');

      if (!link) {
        const apiUrl = `${env.API_URL}/api/internal/links?domain=${encodeURIComponent(domain)}&slug=${encodeURIComponent(slug)}`;
        const apiResponse = await fetch(apiUrl, {
          headers: { 'x-worker-secret': env.WORKER_SECRET },
        });
        if (apiResponse.ok) {
          link = await apiResponse.json();
          if (link) {
            ctx.waitUntil(env.LINKS_KV.put(cacheKey, JSON.stringify(link), { expirationTtl: 60 }));
          }
        }
      }

      if (!link) {
        if (hostIsPivotUrl) {
          return proxyAuthenticatedRequest(pathname, url.search, request, host);
        }
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      if (!link.isActive) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const now = new Date();
      if (link.expiresAt && new Date(link.expiresAt) < now) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      if (link.expiresAfterClicks && link.totalClicks >= link.expiresAfterClicks) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      if (link.password) {
        return Response.redirect(`${env.API_URL}/challenge/${link.slug}`, 302);
      }

      const userAgent = request.headers.get('User-Agent') || '';
      const device = detectDevice(userAgent);
      // Country detection — prefer Cloudflare's request.cf context (the most
      // accurate), then fall back to forwarded headers, and finally to
      // "Unknown". Using only `cf?.country` left clicks as "Unknown" whenever
      // the request lacked the cf object, which produced an analytics view
      // that always showed the same country.
      const cfContext = (request as any).cf;
      const rawCountry =
        cfContext?.country ||
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-vercel-ip-country') ||
        '';
      const country = rawCountry && rawCountry !== 'XX' ? rawCountry : '';
      const rawCity = cfContext?.city || request.headers.get('cf-ipcity') || '';
      const city = rawCity && rawCity !== 'XX' ? rawCity : '';
      const rawRegion = cfContext?.region || request.headers.get('cf-region') || '';
      const region = rawRegion && rawRegion !== 'XX' ? rawRegion : '';

      // Debug: log raw CF context for country detection diagnostics
      console.log(JSON.stringify({
        tag: 'country-debug',
        slug,
        cfCountry: cfContext?.country,
        cfColo: cfContext?.colo,
        cfCity: cfContext?.city,
        cfRegion: cfContext?.region,
        headerCfIp: request.headers.get('cf-ipcountry'),
        headerVercelCountry: request.headers.get('x-vercel-ip-country'),
        rawCountry,
        finalCountry: country,
        ip: request.headers.get('CF-Connecting-IP'),
      }));
      const language = request.headers.get('Accept-Language')?.split(',')[0] || 'en';
      const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
      const ipHash = await hashIP(ip);

      const uniqueKey = `uniq:${link.id}:${ipHash}`;
      const existingUnique = await env.LINKS_KV.get(uniqueKey);
      const isUnique = !existingUnique;
      if (isUnique) {
        ctx.waitUntil(env.LINKS_KV.put(uniqueKey, '1', { expirationTtl: 86400 }));
      }

      const context: RequestContext = { device, country, city, region, language, ipHash, isUnique };
      const { destination, variant } = resolveDestination(link, context);

      const referrer = request.headers.get('Referer');
      if (device !== 'bot') {
        ctx.waitUntil(queueClick(env, link, context, userAgent, referrer, variant, url));
      }

      return Response.redirect(destination, 302);

    } catch (error) {
      console.error('Redirect error:', error);
      return new Response(NOT_FOUND_PAGE, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    } catch (error) {
      console.error('[worker] Unhandled fetch error:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  },
};

// ─── Cron Trigger Handlers ────────────────────────────────────────────────
// Replaces GitHub Actions cron jobs with Workers Cron Triggers

async function handleDomainStatusSync(env: Env): Promise<void> {
  console.log('[cron] Running domain status sync');
  try {
    const response = await fetch(`${env.API_URL}/api/internal/domains/status-sync`, {
      method: 'POST',
      headers: {
        'x-worker-secret': env.WORKER_SECRET,
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[cron] Domain status sync complete:', data);
    } else {
      console.warn('[cron] Domain status sync failed:', response.status);
    }
  } catch (err) {
    console.error('[cron] Domain status sync error:', err);
  }
}

async function handleUrlScannerRescan(env: Env): Promise<void> {
  console.log('[cron] Running URL scanner rescan');
  try {
    const response = await fetch(`${env.API_URL}/api/internal/url-scanner/rescan-due`, {
      method: 'POST',
      headers: {
        'x-worker-secret': env.WORKER_SECRET,
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[cron] URL scanner rescan complete:', data);
    } else {
      console.warn('[cron] URL scanner rescan failed:', response.status);
    }
  } catch (err) {
    console.error('[cron] URL scanner rescan error:', err);
  }
}

async function handleUrlScannerRetention(env: Env): Promise<void> {
  console.log('[cron] Running URL scanner retention');
  try {
    const response = await fetch(`${env.API_URL}/api/internal/url-scanner/retention`, {
      method: 'POST',
      headers: {
        'x-worker-secret': env.WORKER_SECRET,
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[cron] URL scanner retention complete:', data);
    } else {
      console.warn('[cron] URL scanner retention failed:', response.status);
    }
  } catch (err) {
    console.error('[cron] URL scanner retention error:', err);
  }
}

export { AnalyticsWebSocket, DistributedLocker, Scheduler, CoordinatedCache, WorkspacePresence, WorkflowEngine, QrStream, WebhookDeliverer, SessionStore, EventLog, AbTestStream, FeatureFlags } from './durable-objects';


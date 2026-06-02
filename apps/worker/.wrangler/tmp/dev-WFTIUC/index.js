var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-hv4zIE/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/bio.ts
var BOT_UA_PATTERNS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "applebot",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "rogerbot",
  "exabot",
  "ia_archiver"
];
function isBot(userAgent) {
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some((p) => ua.includes(p));
}
__name(isBot, "isBot");
function detectDevice(ua) {
  const u = ua.toLowerCase();
  if (isBot(u)) return "bot";
  if (u.includes("ipad") || u.includes("android") && !u.includes("mobile")) return "tablet";
  if (u.includes("mobile") || u.includes("android") || u.includes("iphone") || u.includes("ipod")) return "mobile";
  return "desktop";
}
__name(detectDevice, "detectDevice");
function detectBrowser(ua) {
  const u = ua.toLowerCase();
  if (u.includes("edg/")) return "edge";
  if (u.includes("opr/") || u.includes("opera")) return "opera";
  if (u.includes("chrome") && !u.includes("edg")) return "chrome";
  if (u.includes("firefox")) return "firefox";
  if (u.includes("safari") && !u.includes("chrome")) return "safari";
  return "other";
}
__name(detectBrowser, "detectBrowser");
function detectOs(ua) {
  const u = ua.toLowerCase();
  if (u.includes("windows")) return "windows";
  if (u.includes("android")) return "android";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ipod")) return "ios";
  if (u.includes("mac os")) return "macos";
  if (u.includes("linux")) return "linux";
  return "other";
}
__name(detectOs, "detectOs");
async function hashIP(ip) {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashIP, "hashIP");
async function queueAnalyticsEvent(env, galleryId, slug, event) {
  const msg = {
    type: "bio-view",
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
    isUnique: event.isUnique
  };
  await env.BIO_EVENT_QUEUE.send(msg);
}
__name(queueAnalyticsEvent, "queueAnalyticsEvent");
async function checkReactionRateLimit(env, ipHash) {
  const key = `bio:rl:reactions:${ipHash}`;
  const current = parseInt(await env.BIO_ANALYTICS_KV.get(key) ?? "0", 10);
  if (current >= 16) return false;
  await env.BIO_ANALYTICS_KV.put(key, String(current + 1), { expirationTtl: 3600 });
  return true;
}
__name(checkReactionRateLimit, "checkReactionRateLimit");
async function serveBioPage(slug, galleryId, request, env, ctx, device) {
  const cacheKey = `bio:html:${slug}`;
  const cached = await env.BIO_PAGES_KV.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Cache": "HIT",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30"
      }
    });
  }
  const originUrl = new URL(request.url);
  originUrl.hostname = new URL(env.API_URL).hostname;
  originUrl.pathname = `/p/${slug}`;
  const originReq = new Request(originUrl.toString(), {
    headers: {
      ...Object.fromEntries(request.headers),
      // Pass device type so Next.js can choose the right grid layout for SSR
      "X-Device-Type": device,
      // Pass full CF geo data
      "X-CF-Country": request.cf?.country ?? "",
      "X-CF-City": request.cf?.city ?? "",
      "X-CF-Region": request.cf?.region ?? "",
      "X-CF-Latitude": request.cf?.latitude ?? "",
      "X-CF-Longitude": request.cf?.longitude ?? ""
    }
  });
  const originRes = await fetch(originReq);
  if (originRes.ok) {
    const html = await originRes.text();
    ctx.waitUntil(
      env.BIO_PAGES_KV.put(cacheKey, html, { expirationTtl: 60 })
    );
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Cache": "MISS",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30"
      }
    });
  }
  return originRes;
}
__name(serveBioPage, "serveBioPage");
async function serveOgImage(slug, request, env, ctx) {
  const cacheKey = `bio:og:${slug}`;
  const cached = await env.BIO_PAGES_KV.get(cacheKey, "arrayBuffer");
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "HIT"
      }
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
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "MISS"
      }
    });
  }
  return originRes;
}
__name(serveOgImage, "serveOgImage");
async function handleBioRequest(request, env, ctx) {
  const url = new URL(request.url);
  const host = request.headers.get("Host") ?? "";
  const pathname = url.pathname;
  const method = request.method;
  let slug = null;
  let galleryId = null;
  const isPivotUrlDomain = host === "pivoturl.com" || host.endsWith(".pivoturl.com");
  if (isPivotUrlDomain && pathname.startsWith("/p/")) {
    slug = pathname.slice(3).split("/")[0] || null;
  } else if (!isPivotUrlDomain) {
    const mapping = await env.BIO_PAGES_KV.get(`bio:domain:${host}`);
    if (mapping) {
      const parsed = JSON.parse(mapping);
      slug = parsed.slug;
      galleryId = parsed.galleryId;
    }
  }
  if (!slug) return null;
  if (pathname.endsWith("/opengraph-image")) {
    return serveOgImage(slug, request, env, ctx);
  }
  if (method === "POST" && pathname === "/api/bio/reactions") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const ipHash = await hashIP(ip);
    const allowed = await checkReactionRateLimit(env, ipHash);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many reactions" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "3600"
        }
      });
    }
    return null;
  }
  const ua = request.headers.get("User-Agent") ?? "";
  const device = detectDevice(ua);
  if (device !== "bot") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const ipHash = await hashIP(ip);
    const uniqueKey = `bio:unique:${slug}:${ipHash}`;
    const existingUnique = await env.BIO_ANALYTICS_KV.get(uniqueKey);
    const isUnique = !existingUnique;
    if (isUnique) {
      ctx.waitUntil(
        env.BIO_ANALYTICS_KV.put(uniqueKey, "1", { expirationTtl: 86400 })
      );
    }
    const cf = request.cf ?? {};
    const event = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      country: cf.country ?? "XX",
      city: cf.city ?? "",
      region: cf.region ?? "",
      lat: cf.latitude,
      lon: cf.longitude,
      device,
      browser: detectBrowser(ua),
      os: detectOs(ua),
      referrer: request.headers.get("Referer") ?? void 0,
      ipHash,
      isUnique
    };
    const eventGalleryId = galleryId ?? `slug:${slug}`;
    ctx.waitUntil(queueAnalyticsEvent(env, eventGalleryId, slug, event));
  }
  return serveBioPage(slug, galleryId ?? "", request, env, ctx, device);
}
__name(handleBioRequest, "handleBioRequest");
async function handleBioPurge(request, env) {
  const secret = request.headers.get("x-worker-secret");
  if (!secret || secret !== env.WORKER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { slug, oldSlug } = await request.json();
    const keysToDelete = [
      `bio:html:${slug}`,
      `bio:og:${slug}`
    ];
    if (oldSlug && oldSlug !== slug) {
      keysToDelete.push(`bio:html:${oldSlug}`, `bio:og:${oldSlug}`);
    }
    await Promise.all(keysToDelete.map((k) => env.BIO_PAGES_KV.delete(k)));
    return new Response(JSON.stringify({ purged: keysToDelete }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
}
__name(handleBioPurge, "handleBioPurge");
async function handleBioDomainMapping(request, env) {
  const secret = request.headers.get("x-worker-secret");
  if (!secret || secret !== env.WORKER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const body = await request.json();
    const kvKey = `bio:domain:${body.domain}`;
    if ("remove" in body && body.remove) {
      await env.BIO_PAGES_KV.delete(kvKey);
    } else if ("slug" in body) {
      const mapping = { slug: body.slug, galleryId: body.galleryId };
      await env.BIO_PAGES_KV.put(kvKey, JSON.stringify(mapping));
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
}
__name(handleBioDomainMapping, "handleBioDomainMapping");

// src/domain-routing.ts
var SYSTEM_FILES = /* @__PURE__ */ new Set([
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json"
]);
function firstSegment(path) {
  return path.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
}
__name(firstSegment, "firstSegment");
function isSystemPath(path) {
  const seg = firstSegment(path);
  if (seg === "") return false;
  if (SYSTEM_FILES.has(seg)) return true;
  if (seg === ".well-known") return true;
  return false;
}
__name(isSystemPath, "isSystemPath");
function resolveRoute(cfg, path) {
  if (cfg.status !== "active") {
    return {
      kind: "suspended",
      httpStatus: cfg.status === "suspended_abuse" ? 410 : 503
    };
  }
  if (isSystemPath(path)) {
    return { kind: "system-passthrough" };
  }
  const seg = firstSegment(path);
  if (seg === "") {
    if (cfg.hasRootBio && cfg.rootBioId) {
      return { kind: "root-bio", galleryId: cfg.rootBioId, slug: cfg.rootBioSlug ?? "" };
    }
    if (cfg.rootRedirectUrl) {
      return { kind: "root-redirect", url: cfg.rootRedirectUrl };
    }
    return { kind: "not-found" };
  }
  if (cfg.role === "links" || cfg.role === "both") {
    return { kind: "link", slug: seg };
  }
  return { kind: "not-found" };
}
__name(resolveRoute, "resolveRoute");

// src/upstash.ts
var UpstashRedis = class {
  static {
    __name(this, "UpstashRedis");
  }
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }
  async send(command) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash error ${res.status}: ${text}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(`Upstash error: ${data.error}`);
    return data.result;
  }
  async pipeline(commands) {
    if (commands.length === 0) return [];
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commands)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash pipeline error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.map((d) => {
      if (d.error) throw new Error(`Upstash pipeline error: ${d.error}`);
      return d.result;
    });
  }
  incr(key) {
    return this.send(["INCR", key]);
  }
  lpush(key, value) {
    return this.send(["LPUSH", key, value]);
  }
  ltrim(key, start, end) {
    return this.send(["LTRIM", key, String(start), String(end)]);
  }
  expire(key, ttl) {
    return this.send(["EXPIRE", key, String(ttl)]);
  }
};

// src/queue-handler.ts
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(today, "today");
async function handleClickBatch(messages, env, redis) {
  const pipeline = [];
  for (const msg of messages) {
    const { slug, device, browser, os, country, referrer, referrerDomain, variant, timestamp } = msg;
    const entry = JSON.stringify({
      ts: timestamp,
      device,
      browser,
      os,
      country,
      referrer: referrer ?? null,
      referrerDomain: referrerDomain ?? null,
      abVariant: variant ?? null
    });
    const date = today();
    pipeline.push(["LPUSH", `clicks:${slug}`, entry]);
    pipeline.push(["LTRIM", `clicks:${slug}`, "0", "49"]);
    pipeline.push(["INCR", `stats:clicks:${slug}:daily:${date}`]);
    pipeline.push(["INCR", `stats:clicks:${slug}:total`]);
    pipeline.push(["INCR", `stats:clicks:daily:${date}`]);
    pipeline.push(["INCR", `stats:clicks:total`]);
  }
  if (pipeline.length > 0) await redis.pipeline(pipeline);
  for (const msg of messages) {
    fetch(`${env.API_URL}/api/internal/clicks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": env.WORKER_SECRET
      },
      body: JSON.stringify({
        linkId: msg.linkId,
        slug: msg.slug,
        destination: msg.destination,
        variant: msg.variant,
        timestamp: new Date(msg.timestamp).toISOString(),
        ipHash: msg.ipHash,
        isUnique: msg.isUnique,
        device: msg.device,
        browser: msg.browser,
        os: msg.os,
        country: msg.country,
        city: msg.city,
        region: msg.region,
        referrer: msg.referrer,
        referrerDomain: msg.referrerDomain,
        language: msg.language,
        isQrScan: msg.isQrScan,
        isDeepLink: msg.isDeepLink
      })
    }).catch((err) => console.error("[queue] click forward failed", err));
  }
}
__name(handleClickBatch, "handleClickBatch");
async function handleBioEventBatch(messages, env, redis) {
  const pipeline = [];
  for (const msg of messages) {
    const { galleryId, ts, country, city, region, device, browser, os, referrer, ipHash, isUnique } = msg;
    const date = ts.slice(0, 10);
    const viewKey = `bio:views:${galleryId}:${date}`;
    pipeline.push(["INCR", viewKey]);
    pipeline.push(["EXPIRE", viewKey, String(90 * 24 * 60 * 60)]);
    const entry = JSON.stringify({ ts, country, city, region, device, browser, os, referrer, ipHash, isUnique });
    pipeline.push(["LPUSH", `bio:events:${galleryId}`, entry]);
    pipeline.push(["LTRIM", `bio:events:${galleryId}`, "0", "499"]);
    pipeline.push(["EXPIRE", `bio:events:${galleryId}`, String(90 * 24 * 60 * 60)]);
  }
  if (pipeline.length > 0) await redis.pipeline(pipeline);
}
__name(handleBioEventBatch, "handleBioEventBatch");
async function handleQueue(batch, env) {
  const redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  const clickMessages = [];
  const bioMessages = [];
  for (const msg of batch.messages) {
    if (msg.body.type === "click") {
      clickMessages.push(msg.body);
    } else if (msg.body.type === "bio-view") {
      bioMessages.push(msg.body);
    }
  }
  const tasks = [];
  if (clickMessages.length > 0) {
    tasks.push(handleClickBatch(clickMessages, env, redis));
  }
  if (bioMessages.length > 0) {
    tasks.push(handleBioEventBatch(bioMessages, env, redis));
  }
  await Promise.all(tasks);
}
__name(handleQueue, "handleQueue");

// src/index.ts
function suspendedPage(httpStatus) {
  const billing = httpStatus === 503;
  const body = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Domain temporarily unavailable</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#09090b;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center"><div><h1 style="margin:0 0 .5rem">Temporarily unavailable</h1><p style="color:#a1a1aa">` + (billing ? "This domain is paused. The workspace owner needs to update their billing." : "This domain has been disabled.") + `</p></div></body></html>`;
  return new Response(body, {
    status: httpStatus,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
__name(suspendedPage, "suspendedPage");
async function getDomainConfig(host, env) {
  const key = `domain:${host}`;
  const cached = await env.BIO_PAGES_KV.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
    }
  }
  try {
    const res = await fetch(
      `${env.API_URL}/api/internal/domain-resolve?host=${encodeURIComponent(host)}`,
      { headers: { "x-worker-secret": env.WORKER_SECRET } }
    );
    if (res.ok) {
      const cfg = await res.json();
      if (cfg) {
        await env.BIO_PAGES_KV.put(key, JSON.stringify(cfg), { expirationTtl: 60 });
        return cfg;
      }
    }
  } catch {
  }
  return null;
}
__name(getDomainConfig, "getDomainConfig");
var NOT_FOUND_PAGE = `<!DOCTYPE html>
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
    <div class="logo">\u2B21 PivotUrl</div>
    <h1>Link not found</h1>
    <p>This link doesn't exist or has been deleted.</p>
    <a href="https://pivoturl.com" class="cta-button">Shorten your own links free \u2192</a>
  </div>
</body>
</html>`;
function detectDevice2(userAgent) {
  const ua = userAgent.toLowerCase();
  const botPatterns = [
    "googlebot",
    "bingbot",
    "slurp",
    "duckduckbot",
    "baiduspider",
    "yandexbot",
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "whatsapp",
    "telegrambot",
    "applebot",
    "semrushbot"
  ];
  if (botPatterns.some((bot) => ua.includes(bot))) return "bot";
  if (ua.includes("ipad") || ua.includes("android") && !ua.includes("mobile")) return "tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipod")) return "mobile";
  return "desktop";
}
__name(detectDevice2, "detectDevice");
function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  let browser;
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "safari";
  else if (ua.includes("firefox")) browser = "firefox";
  else if (ua.includes("edg")) browser = "edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "opera";
  let os;
  if (ua.includes("windows")) os = "windows";
  else if (ua.includes("mac os") || ua.includes("macos")) os = "macos";
  else if (ua.includes("linux")) os = "linux";
  else if (ua.includes("android")) os = "android";
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "ios";
  return { browser, os };
}
__name(parseUserAgent, "parseUserAgent");
function resolveDestination(link, context) {
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
__name(resolveDestination, "resolveDestination");
async function hashIP2(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashIP2, "hashIP");
async function queueClick(env, link, context, userAgent, referrer, variant) {
  const { browser, os } = parseUserAgent(userAgent);
  const msg = {
    type: "click",
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
    referrer: referrer || void 0,
    referrerDomain: referrer ? extractDomain(referrer) : void 0,
    variant,
    isQrScan: false,
    isDeepLink: false,
    timestamp: Date.now()
  };
  await env.CLICK_QUEUE.send(msg);
}
__name(queueClick, "queueClick");
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return void 0;
  }
}
__name(extractDomain, "extractDomain");
var src_default = {
  async queue(batch, env) {
    await handleQueue(batch, env);
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = request.headers.get("Host") || "";
    const pathname = url.pathname;
    if (pathname === "/internal/bio/purge" && request.method === "POST") {
      return handleBioPurge(request, env);
    }
    if (pathname === "/internal/bio/domain-mapping" && request.method === "POST") {
      return handleBioDomainMapping(request, env);
    }
    if (pathname === "/internal/domain-config" && request.method === "POST") {
      const secret = request.headers.get("x-worker-secret");
      if (!secret || secret !== env.WORKER_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
      try {
        const body = await request.json();
        const key = `domain:${body.host}`;
        if ("remove" in body && body.remove) {
          await env.BIO_PAGES_KV.delete(key);
        } else if ("config" in body) {
          await env.BIO_PAGES_KV.put(key, JSON.stringify(body.config));
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
    }
    {
      const isPivotUrl = host === "pivoturl.com" || host.endsWith(".pivoturl.com");
      if (!isPivotUrl) {
        const cfg = await getDomainConfig(host, env);
        if (cfg) {
          const route = resolveRoute(cfg, pathname);
          switch (route.kind) {
            case "suspended":
              return suspendedPage(route.httpStatus);
            case "system-passthrough":
              return fetch(request);
            case "root-redirect":
              return Response.redirect(route.url, 302);
            case "root-bio": {
              const bioResponse = await handleBioRequest(request, env, ctx);
              if (bioResponse) return bioResponse;
              return new Response(NOT_FOUND_PAGE, {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" }
              });
            }
            case "link":
              break;
            case "not-found":
              return new Response(NOT_FOUND_PAGE, {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" }
              });
          }
        }
      }
    }
    const isPivotUrlDomain = host === "pivoturl.com" || host.endsWith(".pivoturl.com");
    const isBioPath = pathname.startsWith("/p/");
    const isReactionPost = request.method === "POST" && pathname === "/api/bio/reactions";
    const isCustomDomain = !isPivotUrlDomain;
    if (isBioPath || isCustomDomain || isReactionPost) {
      const bioResponse = await handleBioRequest(request, env, ctx);
      if (bioResponse) return bioResponse;
    }
    const domain = host;
    const slug = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    if (!slug) {
      return new Response(NOT_FOUND_PAGE, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    const cacheKey = `${domain}:${slug}`;
    try {
      let link = await env.LINKS_KV.get(cacheKey, "json");
      if (!link) {
        const apiUrl = `${env.API_URL}/api/internal/links?domain=${encodeURIComponent(domain)}&slug=${encodeURIComponent(slug)}`;
        const apiResponse = await fetch(apiUrl, {
          headers: { "x-worker-secret": env.WORKER_SECRET }
        });
        if (apiResponse.ok) {
          link = await apiResponse.json();
          if (link) {
            ctx.waitUntil(env.LINKS_KV.put(cacheKey, JSON.stringify(link), { expirationTtl: 60 }));
          }
        }
      }
      if (!link) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      if (!link.isActive) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      const now = /* @__PURE__ */ new Date();
      if (link.expiresAt && new Date(link.expiresAt) < now) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      if (link.expiresAfterClicks && link.totalClicks >= link.expiresAfterClicks) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      if (link.password) {
        return Response.redirect(`${env.API_URL}/challenge/${link.slug}`, 302);
      }
      const userAgent = request.headers.get("User-Agent") || "";
      const device = detectDevice2(userAgent);
      const country = request.cf?.country || "Unknown";
      const city = request.cf?.city || "Unknown";
      const region = request.cf?.region || "Unknown";
      const language = request.headers.get("Accept-Language")?.split(",")[0] || "en";
      const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
      const ipHash = await hashIP2(ip);
      const uniqueKey = `uniq:${link.id}:${ipHash}`;
      const existingUnique = await env.LINKS_KV.get(uniqueKey);
      const isUnique = !existingUnique;
      if (isUnique) {
        ctx.waitUntil(env.LINKS_KV.put(uniqueKey, "1", { expirationTtl: 86400 }));
      }
      const context = { device, country, city, region, language, ipHash, isUnique };
      const { destination, variant } = resolveDestination(link, context);
      const referrer = request.headers.get("Referer");
      if (device !== "bot") {
        ctx.waitUntil(queueClick(env, link, context, userAgent, referrer, variant));
      }
      return Response.redirect(destination, 302);
    } catch (error) {
      console.error("Redirect error:", error);
      return new Response(NOT_FOUND_PAGE, {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }
};

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-hv4zIE/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-hv4zIE/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

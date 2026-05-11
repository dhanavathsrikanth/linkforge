import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Redis } from "@upstash/redis/cloudflare";
import { Ratelimit } from "@upstash/ratelimit";
import { parseDevice, parseBrowser, parseOs, hashIp, pickAbVariant, getDomain } from "./utils";

type Bindings = {
  LINKS_KV: KVNamespace;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Cache for Ratelimit
const ratelimitCache = new Map();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["https://linkforge.app", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "linkforge-worker", ts: Date.now() });
});

// Cache invalidate
app.post("/api/cache/invalidate", async (c) => {
  const { slug } = await c.req.json();
  if (!slug) return c.json({ error: "Missing slug" }, 400);
  await c.env.LINKS_KV.delete(slug);
  return c.json({ success: true });
});

// ─── Short link redirect ───────────────────────────────────────────────────────
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  if (!slug || slug.length < 2) {
    return c.json({ error: "Invalid slug" }, 400);
  }

  try {
    // Step A — Parse request
    const country = c.req.header("cf-ipcountry") || "unknown";
    const rawIp = c.req.header("cf-connecting-ip") || "127.0.0.1";
    
    // Step A.0 — Rate Limiting
    const redis = new Redis({
      url: c.env.UPSTASH_REDIS_REST_URL,
      token: c.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds per IP
      ephemeralCache: ratelimitCache,
    });
    
    const { success } = await ratelimit.limit(`ratelimit_${rawIp}`);
    if (!success) {
      return c.json({ error: "Too many requests" }, 429);
    }

    // Step A — Parse request
    const rawUa = c.req.header("user-agent") || "";
    const deviceType = parseDevice(rawUa);
    const browser = parseBrowser(rawUa);
    const os = parseOs(rawUa);
    const referrer = c.req.header("referer") || "";
    const referrerDomain = getDomain(referrer);
    const rawIp = c.req.header("cf-connecting-ip") || "127.0.0.1";
    const ipHash = await hashIp(rawIp);

    // Step B — Check KV cache first
    let linkData: any = await c.env.LINKS_KV.get(slug, "json");

    if (!linkData) {
      // Fallback: query DB via Next.js API (edge-to-origin)
      const origin =
        c.env.ENVIRONMENT === "production"
          ? "https://linkforge.app"
          : "http://localhost:3000";

      const res = await fetch(`${origin}/api/links/resolve?slug=${slug}`, {
        headers: { "x-worker-secret": "internal" },
      });

      if (!res.ok) {
        return c.html(notFoundPage(), 404);
      }

      linkData = await res.json();
      
      // Store in KV with 5-minute TTL
      c.executionCtx.waitUntil(
        c.env.LINKS_KV.put(slug, JSON.stringify(linkData), { expirationTtl: 300 })
      );
    }

    if (!linkData || !linkData.isActive) {
      return c.html(notFoundPage(), 404);
    }

    // Step C — Smart Routing
    let finalDestination = linkData.destination;
    let variantId = "";

    if (linkData.abTestEnabled && linkData.abTestVariants?.length > 0) {
      finalDestination = pickAbVariant(linkData.abTestVariants);
      variantId = finalDestination; // Simplified for tracking
    } else if (linkData.geoRouting && linkData.geoRouting[country]) {
      finalDestination = linkData.geoRouting[country];
    } else if (deviceType === "mobile" && os === "iOS" && linkData.iosDestination) {
      finalDestination = linkData.iosDestination;
    } else if (deviceType === "mobile" && os === "Android" && linkData.androidDestination) {
      finalDestination = linkData.androidDestination;
    }

    // Append query params and UTM parameters
    try {
      const destUrl = new URL(finalDestination);
      const reqUrl = new URL(c.req.url);
      reqUrl.searchParams.forEach((val, key) => {
        destUrl.searchParams.set(key, val);
      });
      if (linkData.utmSource && !destUrl.searchParams.has("utm_source")) destUrl.searchParams.set("utm_source", linkData.utmSource);
      if (linkData.utmMedium && !destUrl.searchParams.has("utm_medium")) destUrl.searchParams.set("utm_medium", linkData.utmMedium);
      if (linkData.utmCampaign && !destUrl.searchParams.has("utm_campaign")) destUrl.searchParams.set("utm_campaign", linkData.utmCampaign);
      if (linkData.utmTerm && !destUrl.searchParams.has("utm_term")) destUrl.searchParams.set("utm_term", linkData.utmTerm);
      if (linkData.utmContent && !destUrl.searchParams.has("utm_content")) destUrl.searchParams.set("utm_content", linkData.utmContent);
      finalDestination = destUrl.toString();
    } catch {
      // Ignored if invalid URL
    }

    // Step D — Password Protection
    if (linkData.password) {
      // Redirect to Next.js origin challenge page to verify password and set a cookie
      // Alternatively, serve a simple challenge page right here.
      // But we'll redirect to origin's challenge page
      const origin =
        c.env.ENVIRONMENT === "production"
          ? "https://linkforge.app"
          : "http://localhost:3000";
          
      // Actually we just check if a cookie like "pw_auth_{slug}" is present. If not, redirect.
      const cookieHeader = c.req.header("cookie") || "";
      if (!cookieHeader.includes(`pw_auth_${slug}=`)) {
        return c.redirect(`${origin}/challenge/${slug}`, 302);
      }
    }

    // Step E — Write log (WaitUntil)
    c.executionCtx.waitUntil(
      recordClick(slug, {
        ts: Date.now(),
        ip: ipHash,
        country,
        device: deviceType,
        browser,
        os,
        referrer,
        referrerDomain,
        abVariant: variantId,
        linkId: linkData.id,
        workspaceId: linkData.workspaceId,
      }, c.env)
    );

    // Step F — Return 302
    return c.redirect(finalDestination, 302);
  } catch (err) {
    console.error("Redirect error:", err);
    return c.html(notFoundPage(), 404);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recordClick(
  slug: string,
  clickData: Record<string, any>,
  env: Bindings
): Promise<void> {
  try {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    // Push the click data to an Upstash Redis list for async processing
    // We use LPUSH to add to the head of the list
    await redis.lpush(`clicks:${slug}`, clickData);
    
    // Also increment a global counter for quick dashboard stats
    await redis.incr(`stats:clicks:total`);
    await redis.incr(`stats:clicks:daily:${new Date().toISOString().split('T')[0]}`);
  } catch (err) {
    console.error("Redis record error:", err);
  }
}

function notFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link Not Found – LinkForge</title>
  <style>
    body { background: #09090b; color: #fff; font-family: system-ui; display: flex;
           flex-direction: column; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; }
    h1   { font-size: 2.5rem; color: #7c3aed; margin-bottom: 0.5rem; }
    p    { color: #a1a1aa; margin-bottom: 2rem; }
    a    { background: #2563eb; color: #fff; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 500; transition: background 0.2s; }
    a:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <h1>⚡ LinkForge</h1>
  <p>This link doesn't exist or has expired.</p>
  <a href="https://linkforge.app">Go to Homepage →</a>
</body>
</html>`;
}

export default app;

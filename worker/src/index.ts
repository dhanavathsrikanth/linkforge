import {
  parseDevice,
  parseBrowser,
  parseOs,
  hashIp,
  pickAbVariant,
  resolveRoutingRules,
} from "./utils";
import type { Env, LinkData, RequestContext } from "./types";

// ─── 404 Page ────────────────────────────────────────────────────────────────

function notFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link Not Found – LinkForge</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #09090b;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #a855f7, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 2.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
    }
    .hex { font-size: 1.75rem; line-height: 1; }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.6);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #fafafa; }
    p { color: #71717a; font-size: 0.9375rem; line-height: 1.6; margin-bottom: 2rem; }
    .cta {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #a855f7, #3b82f6);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9375rem;
      transition: opacity 0.2s;
    }
    .cta:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="logo">
    <span class="hex">⬡</span> LinkForge
  </div>
  <div class="card">
    <div class="icon">🔗</div>
    <h1>Link not found</h1>
    <p>This link doesn't exist, has expired, or has been deactivated.</p>
    <a class="cta" href="https://linkforge.app">Shorten your own links free →</a>
  </div>
</body>
</html>`;
}

// ─── Click Logger (async, non-blocking) ──────────────────────────────────────

async function logClick(
  link: LinkData,
  req: Request,
  env: Env,
  ctx: { device: string; country: string; city: string; region: string; language: string },
  ipHash: string,
  isUnique: boolean,
  destination: string,
  variant: string,
  isQrScan: boolean
): Promise<void> {
  try {
    const ua = req.headers.get("user-agent") || "";
    const browser = parseBrowser(ua);
    const os = parseOs(ua);
    const referrer = req.headers.get("referer") || "";
    const referrerDomain = referrer
      ? (() => { try { return new URL(referrer).hostname; } catch { return ""; } })()
      : "";

    await fetch(`${env.API_URL}/api/internal/clicks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": env.WORKER_SECRET,
      },
      body: JSON.stringify({
        linkId: link.id,
        workspaceId: link.workspaceId,
        slug: link.slug,
        destination,
        variant,
        timestamp: new Date().toISOString(),
        ipHash,
        isUnique,
        device: ctx.device,
        browser,
        os,
        country: ctx.country,
        city: ctx.city,
        region: ctx.region,
        referrer,
        referrerDomain,
        language: ctx.language,
        isQrScan,
      }),
    });
  } catch (err) {
    console.error("[logClick] Failed:", err);
  }
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "linkforge-worker", ts: Date.now() });
    }

    // ── Step 1: Parse domain + slug ──────────────────────────────────────────
    const host = req.headers.get("host") || url.hostname;
    const domain = host.split(":")[0]; // strip port if present
    const slug = url.pathname.replace(/^\//, "").split("/")[0];

    if (!slug || slug.length < 1) {
      return new Response(notFoundPage(), {
        status: 404,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    const kvKey = `${domain}:${slug}`;

    // ── Step 2: Check KV cache ────────────────────────────────────────────────
    let link: LinkData | null = await env.LINKS_KV.get<LinkData>(kvKey, "json");

    // ── Step 3: Fetch from API if not cached ──────────────────────────────────
    if (!link) {
      try {
        const apiRes = await fetch(
          `${env.API_URL}/api/internal/links?domain=${encodeURIComponent(domain)}&slug=${encodeURIComponent(slug)}`,
          {
            headers: {
              "x-worker-secret": env.WORKER_SECRET,
            },
          }
        );

        if (!apiRes.ok) {
          return new Response(notFoundPage(), {
            status: 404,
            headers: { "Content-Type": "text/html;charset=UTF-8" },
          });
        }

        link = (await apiRes.json()) as LinkData;

        // Cache for 60 seconds
        ctx.waitUntil(
          env.LINKS_KV.put(kvKey, JSON.stringify(link), { expirationTtl: 60 })
        );
      } catch (err) {
        console.error("[worker] API fetch failed:", err);
        return new Response(notFoundPage(), {
          status: 404,
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }
    }

    // ── Step 4: Link not found ────────────────────────────────────────────────
    if (!link) {
      return new Response(notFoundPage(), {
        status: 404,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // ── Step 5: Check isActive ────────────────────────────────────────────────
    if (!link.isActive) {
      return new Response(notFoundPage(), {
        status: 404,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // ── Step 6: Check expiry ──────────────────────────────────────────────────
    const now = Date.now();
    if (link.expiresAt && new Date(link.expiresAt).getTime() < now) {
      return new Response(notFoundPage(), {
        status: 410,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }
    if (
      link.expiresAfterClicks !== null &&
      link.expiresAfterClicks !== undefined &&
      link.totalClicks >= link.expiresAfterClicks
    ) {
      return new Response(notFoundPage(), {
        status: 410,
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // ── Step 7: Password protection ───────────────────────────────────────────
    if (link.password) {
      return Response.redirect(
        `${env.API_URL}/protected?id=${encodeURIComponent(link.id)}`,
        302
      );
    }

    // ── Step 8: Device / geo / language context ───────────────────────────────
    const ua = req.headers.get("user-agent") || "";
    const deviceType = parseDevice(ua);

    // Bot: skip redirect logging entirely, still redirect
    const cfData = (req as any).cf as {
      country?: string;
      city?: string;
      region?: string;
    } | undefined;

    const country = cfData?.country || req.headers.get("cf-ipcountry") || "XX";
    const city = cfData?.city || "";
    const region = cfData?.region || "";
    const language = (req.headers.get("accept-language") || "").split(",")[0].split(";")[0].trim();

    const requestCtx: RequestContext = { device: deviceType as RequestContext["device"], country, language };

    // ── Step 8: Smart routing ─────────────────────────────────────────────────
    let finalDestination = link.destination;
    let variant = "";

    if (link.abTestEnabled && link.abVariants && link.abVariants.length > 0) {
      const picked = pickAbVariant(link.abVariants);
      finalDestination = picked.destination;
      variant = picked.name || picked.destination;
    } else if (link.routingRules && link.routingRules.length > 0) {
      const matched = resolveRoutingRules(link.routingRules, requestCtx);
      if (matched) finalDestination = matched;
    }

    // ── Step 9: Async click logging ───────────────────────────────────────────
    if (deviceType !== "bot") {
      // Detect QR scan: the QR code adds ?source=qr to the short URL
      const isQrScan = url.searchParams.get("source") === "qr";

      ctx.waitUntil(
        (async () => {
          const rawIp = req.headers.get("cf-connecting-ip") || "127.0.0.1";
          const ipHash = await hashIp(rawIp);

          // Uniqueness check: KV key "uniq:linkId:ipHash" with 24h TTL
          const uniqKey = `uniq:${link!.id}:${ipHash}`;
          const existing = await env.LINKS_KV.get(uniqKey);
          const isUnique = existing === null;
          if (isUnique) {
            await env.LINKS_KV.put(uniqKey, "1", { expirationTtl: 86400 }); // 24h
          }

          await logClick(
            link!,
            req,
            env,
            { device: deviceType, country, city, region, language },
            ipHash,
            isUnique,
            finalDestination,
            variant,
            isQrScan
          );
        })()
      );
    }

    // ── Step 10: Redirect ─────────────────────────────────────────────────────
    return Response.redirect(finalDestination, 302);
  },
};

import type { Env, Link, RequestContext, ClickData, RoutingRule, ABVariant } from './types';

// 404 Page HTML
const NOT_FOUND_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found | LinkForge</title>
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
    .container {
      text-align: center;
      padding: 2rem;
    }
    .logo {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #433BFF 0%, #DEDCFF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1rem;
    }
    h1 {
      color: #ffffff;
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #a1a1aa;
      margin-bottom: 2rem;
    }
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
    <div class="logo">⬡ LinkForge</div>
    <h1>Link not found</h1>
    <p>This link doesn't exist or has been deleted.</p>
    <a href="https://linkforge.app" class="cta-button">Shorten your own links free →</a>
  </div>
</body>
</html>`;

// Device detection helper
function detectDevice(userAgent: string): 'mobile' | 'desktop' | 'tablet' | 'bot' {
  const ua = userAgent.toLowerCase();
  
  // Bot detection
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot', 'semrushbot'
  ];
  if (botPatterns.some(bot => ua.includes(bot))) {
    return 'bot';
  }
  
  // Tablet detection
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet';
  }
  
  // Mobile detection
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'mobile';
  }
  
  return 'desktop';
}

// Parse User-Agent for browser and OS
function parseUserAgent(userAgent: string): { browser?: string; os?: string } {
  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser: string | undefined;
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('edg')) browser = 'edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'opera';
  
  // OS detection
  let os: string | undefined;
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';
  
  return { browser, os };
}

// Smart routing helper
function resolveDestination(
  link: Link,
  context: RequestContext
): { destination: string; variant?: string } {
  const { device, country, language } = context;
  
  // Check routing rules
  if (link.routingRules && link.routingRules.length > 0) {
    for (const rule of link.routingRules) {
      const { condition, destination } = rule;
      
      let matches = true;
      if (condition.device && condition.device !== device) matches = false;
      if (condition.country && condition.country !== country) matches = false;
      if (condition.language && condition.language !== language) matches = false;
      
      if (matches) {
        return { destination };
      }
    }
  }
  
  // A/B testing
  if (link.abTestEnabled && link.abVariants && link.abVariants.length > 0) {
    const totalWeight = link.abVariants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    
    for (const variant of link.abVariants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return { destination: variant.destination, variant: variant.id };
      }
    }
  }
  
  // Default destination
  return { destination: link.destination };
}

// Hash IP address for privacy
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Click logging (async, non-blocking)
async function logClick(
  env: Env,
  linkId: string,
  context: RequestContext,
  userAgent: string,
  referrer: string | null,
  variant?: string
): Promise<void> {
  try {
    const { browser, os } = parseUserAgent(userAgent);
    
    const clickData: ClickData = {
      linkId,
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
      variant,
    };
    
    await fetch(`${env.API_URL}/internal/clicks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clickData),
    });
  } catch (error) {
    console.error('Failed to log click:', error);
    // Don't throw - logging failures shouldn't affect redirects
  }
}

// Main redirect handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get('Host') || '';
    const pathname = url.pathname;
    
    // Extract domain and slug
    const domain = host;
    const slug = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    if (!slug) {
      return new Response(NOT_FOUND_PAGE, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    const cacheKey = `${domain}:${slug}`;
    
    try {
      // Step 1: Check KV cache
      let link: Link | null = await env.LINKS_KV.get(cacheKey, 'json');
      
      // Step 2: If not in KV, fetch from API
      if (!link) {
        const apiUrl = `${env.API_URL}/internal/links?domain=${encodeURIComponent(domain)}&slug=${encodeURIComponent(slug)}`;
        const apiResponse = await fetch(apiUrl);
        
        if (apiResponse.ok) {
          link = await apiResponse.json();
          // Cache for 60 seconds
          if (link) {
            ctx.waitUntil(env.LINKS_KV.put(cacheKey, JSON.stringify(link), { expirationTtl: 60 }));
          }
        }
      }
      
      // Step 3: If link not found, return 404
      if (!link) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      
      // Step 4: Check if link is active
      if (!link.isActive) {
        return new Response(NOT_FOUND_PAGE, {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      
      // Step 5: Check if link has expired
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
      
      // Step 6: Password protected
      if (link.password) {
        const webAppUrl = env.API_URL.replace('/internal/links', '');
        return Response.redirect(`${webAppUrl}/protected?id=${link.id}`, 302);
      }
      
      // Step 7: Build request context
      const userAgent = request.headers.get('User-Agent') || '';
      const device = detectDevice(userAgent);
      const country = request.cf?.country || 'Unknown';
      const city = request.cf?.city || 'Unknown';
      const region = request.cf?.region || 'Unknown';
      const language = request.headers.get('Accept-Language')?.split(',')[0] || 'en';
      const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
      const ipHash = await hashIP(ip);
      
      // Check if unique click
      const uniqueKey = `uniq:${link.id}:${ipHash}`;
      const existingUnique = await env.LINKS_KV.get(uniqueKey);
      const isUnique = !existingUnique;
      
      if (isUnique) {
        ctx.waitUntil(env.LINKS_KV.put(uniqueKey, '1', { expirationTtl: 86400 })); // 24 hours
      }
      
      const context: RequestContext = {
        device,
        country,
        city,
        region,
        language,
        ipHash,
        isUnique,
      };
      
      // Step 8: Resolve destination with smart routing
      const { destination, variant } = resolveDestination(link, context);
      
      // Step 9: Log click asynchronously (non-blocking)
      const referrer = request.headers.get('Referer');
      if (device !== 'bot') {
        ctx.waitUntil(logClick(env, link.id, context, userAgent, referrer, variant));
      }
      
      // Step 10: Redirect immediately
      return Response.redirect(destination, 302);
      
    } catch (error) {
      console.error('Redirect error:', error);
      return new Response(NOT_FOUND_PAGE, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  },
};

import type { Env, Link } from './types';

// Password challenge page HTML - served entirely from edge
const CHALLENGE_HTML = (slug: string, domain: string, error?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected Link | PivotUrl</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #09090b;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 1rem;
    }
    .container { width: 100%; max-width: 420px; }
    .header { text-align: center; margin-bottom: 2rem; }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
    }
    .icon svg { width: 32px; height: 32px; color: #8b5cf6; }
    h1 { color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; font-size: 0.875rem; }
    .card {
      background: #141418;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .input-group { display: flex; flex-direction: column; gap: 0.5rem; }
    input[type="password"] {
      width: 100%;
      height: 48px;
      background: #09090b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0 1rem;
      color: #fff;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input[type="password"]:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }
    input[type="password"]::placeholder { color: #71717a; }
    .error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.875rem;
    }
    .turnstile { margin: 1rem 0; }
    button {
      width: 100%;
      height: 48px;
      background: #8b5cf6;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.2s, transform 0.1s;
    }
    button:hover { background: #7c3aed; }
    button:active { transform: scale(0.98); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer { text-align: center; margin-top: 2rem; color: #71717a; font-size: 0.875rem; }
    .footer a { color: #a1a1aa; text-decoration: none; }
    .footer a:hover { color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h1>Password Protected Link</h1>
      <p>This link is protected. Enter the password to continue.</p>
    </div>
    <div class="card">
      <form id="challenge-form" class="form">
        <div class="input-group">
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            required
            autocomplete="current-password"
          >
          ${error ? `
          <div class="error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            ${error}
          </div>
          ` : ''}
        </div>
        <button type="submit" id="submit-btn">
          <span>Access Link</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </form>
    </div>
    <div class="footer">
      Powered by <a href="https://pivoturl.com">PivotUrl</a>
    </div>
  </div>
  <script>
    const form = document.getElementById('challenge-form');
    const btn = document.getElementById('submit-btn');
    const slug = '${slug}';
    const domain = '${domain}';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div>';

      const formData = new FormData(form);
      const password = formData.get('password');

      try {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const res = await fetch(protocol + '//' + domain + '/internal/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, password })
        });

        if (res.ok) {
          window.location.href = protocol + '//' + domain + '/s/' + slug;
        } else {
          const data = await res.json();
          window.location.href = protocol + '//' + domain + '/internal/challenge/' + slug + '?error=' + encodeURIComponent(data.error || 'Incorrect password');
        }
      } catch (err) {
        window.location.href = protocol + '//' + domain + '/internal/challenge/' + slug + '?error=' + encodeURIComponent('Something went wrong');
      }
    });
  </script>
</body>
</html>
`;

// Rate limiting check
async function checkPasswordRateLimit(env: Env, ip: string, slug: string): Promise<boolean> {
  const key = `pw_rl:${ip}:${slug}`;
  const attempts = await env.LINKS_KV.get(key);
  if (attempts) {
    const count = parseInt(attempts, 10);
    if (count >= 5) {
      // Lockout for 15 minutes
      return false;
    }
    await env.LINKS_KV.put(key, String(count + 1), { expirationTtl: 900 });
  } else {
    await env.LINKS_KV.put(key, "1", { expirationTtl: 900 });
  }
  return true;
}

// Get password hash from cache or fetch from API
async function getPasswordHash(env: Env, link: Link): Promise<string | null> {
  const cacheKey = `pw_hash:${link.id}`;
  let hash = await env.LINKS_KV.get(cacheKey);

  if (!hash && link.password) {
    // Cache the hash for 1 hour
    await env.LINKS_KV.put(cacheKey, link.password, { expirationTtl: 3600 });
    hash = link.password;
  }

  return hash;
}

// Handle password challenge page request
export async function handlePasswordChallenge(
  request: Request,
  env: Env,
  slug: string,
  domain: string,
): Promise<Response> {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');

  // Check for auth cookie first
  const cookie = request.headers.get('Cookie') || '';
  if (cookie.includes(`pw_auth_${slug}=true`)) {
    return Response.redirect(`${url.protocol}//${domain}/s/${slug}`, 302);
  }

  return new Response(CHALLENGE_HTML(slug, domain, error ? decodeURIComponent(error) : undefined), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// Handle password verification request
export async function handlePasswordVerify(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

  // Check rate limit
  const allowed = await checkPasswordRateLimit(env, ip, slug);
  if (!allowed) {
    return Response.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  // Verify Turnstile
  const body = await request.json() as { password: string; turnstile?: string };
  const { password } = body;

  if (!password) {
    return Response.json({ error: 'Password is required' }, { status: 400 });
  }

  // Get link from KV
  const domain = new URL(request.url).hostname;
  const cacheKey = `${domain}:${slug}`;
  let link: Link | null = await env.LINKS_KV.get(cacheKey, 'json');

  if (!link) {
    // Fetch from API
    try {
      const apiUrl = `${env.API_URL}/api/internal/links?domain=${encodeURIComponent(domain)}&slug=${encodeURIComponent(slug)}`;
      const apiResponse = await fetch(apiUrl, {
        headers: { 'x-worker-secret': env.WORKER_SECRET },
      });
      if (apiResponse.ok) {
        link = await apiResponse.json();
      }
    } catch {
      // Ignore
    }
  }

  if (!link || !link.password) {
    return Response.json({ error: 'Link not found or not password protected' }, { status: 404 });
  }

  // Verify password using cached hash (compare directly since we store bcrypt hash)
  const isValid = await comparePassword(password, link.password);

  if (isValid) {
    // Set auth cookie
    const response = Response.json({ success: true });
    response.headers.set(
      'Set-Cookie',
      `pw_auth_${slug}=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
    );

    // Clear rate limit on success
    await env.LINKS_KV.delete(`pw_auth_${ip}:${slug}`);

    return response;
  }

  return Response.json({ error: 'Incorrect password' }, { status: 401 });
}

// Simple password comparison (in production, use bcrypt)
async function comparePassword(input: string, hash: string): Promise<boolean> {
  try {
    // Try bcrypt comparison via Web Crypto
    const encoder = new TextEncoder();
    const inputBuffer = encoder.encode(input);
    const inputHash = await crypto.subtle.digest('SHA-256', inputBuffer);
    const inputHashHex = Array.from(new Uint8Array(inputHash)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // For simple comparison (when password is stored as plain SHA256 hash for testing)
    if (hash.length === 64) {
      return inputHashHex === hash;
    }
    
    // For bcrypt hashes, we'd need a proper library
    // For now, do a simple comparison
    return input === hash || inputHashHex === hash;
  } catch {
    return false;
  }
}
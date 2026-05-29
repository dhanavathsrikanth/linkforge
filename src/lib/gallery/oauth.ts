import type { IntegrationType, OAuthTokenSet } from "./integrations";

interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  spotify: {
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: ["user-read-currently-playing", "user-read-recently-played", "user-top-read"],
    clientId: () => process.env.SPOTIFY_CLIENT_ID,
    clientSecret: () => process.env.SPOTIFY_CLIENT_SECRET,
  },
  instagram: {
    authorizeUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    clientId: () => process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: () => process.env.INSTAGRAM_CLIENT_SECRET,
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    scopes: ["user.info.basic", "user.info.profile", "video.list"],
    clientId: () => process.env.TIKTOK_CLIENT_ID,
    clientSecret: () => process.env.TIKTOK_CLIENT_SECRET,
  },
  threads: {
    authorizeUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    scopes: ["threads_basic", "threads_read_replies"],
    clientId: () => process.env.THREADS_CLIENT_ID,
    clientSecret: () => process.env.THREADS_CLIENT_SECRET,
  },
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "public_repo"],
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
  },
};

export function getOAuthConfig(type: string): OAuthConfig | undefined {
  return OAUTH_CONFIGS[type];
}

export function buildAuthorizeUrl(
  type: IntegrationType,
  state: string,
  redirectUri: string
): string | null {
  const config = getOAuthConfig(type);
  if (!config) return null;

  const clientId = config.clientId();
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCode(
  type: IntegrationType,
  code: string,
  redirectUri: string
): Promise<OAuthTokenSet> {
  const config = getOAuthConfig(type);
  if (!config) throw new Error(`Unknown OAuth provider: ${type}`);

  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth provider ${type} is not configured`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  // GitHub requires a special Accept header
  if (type === "github") {
    headers.Accept = "application/json";
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed for ${type}: ${res.status} ${text}`);
  }

  const data = await res.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

export async function refreshToken(
  type: IntegrationType,
  tokenSet: OAuthTokenSet
): Promise<OAuthTokenSet> {
  if (!tokenSet.refreshToken) {
    throw new Error(`No refresh token available for ${type}`);
  }

  const config = getOAuthConfig(type);
  if (!config) throw new Error(`Unknown OAuth provider: ${type}`);

  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) {
    throw new Error(`OAuth provider ${type} is not configured`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokenSet.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed for ${type}: ${res.status} ${text}`);
  }

  const data = await res.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokenSet.refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

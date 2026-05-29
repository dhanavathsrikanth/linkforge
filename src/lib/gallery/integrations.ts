export type IntegrationType = "spotify" | "instagram" | "tiktok" | "threads" | "github";

export interface IntegrationProvider {
  type: IntegrationType;
  label: string;
  icon: string;
  description: string;
  color: string;
  /** Connected block types this integration powers */
  powersBlocks: string[];
  /** Whether env vars are configured for this provider */
  configured: boolean;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

export type IntegrationConfig = Record<string, unknown> & {
  tokens: OAuthTokenSet;
  state?: string;
  profile?: {
    id?: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
};

function hasEnv(prefix: string): boolean {
  return !!(
    process.env[`${prefix}_CLIENT_ID`] && process.env[`${prefix}_CLIENT_SECRET`]
  );
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    type: "spotify",
    label: "Spotify",
    icon: "spotify",
    description: "Show your currently playing track and playlists",
    color: "#1DB954",
    powersBlocks: ["spotify-embed", "spotify-playing-now"],
    configured: hasEnv("SPOTIFY"),
  },
  {
    type: "instagram",
    label: "Instagram",
    icon: "instagram",
    description: "Display your latest Instagram posts and follower count",
    color: "#E4405F",
    powersBlocks: ["instagram-latest-post", "instagram-follower-count"],
    configured: hasEnv("INSTAGRAM"),
  },
  {
    type: "tiktok",
    label: "TikTok",
    icon: "tiktok",
    description: "Show your latest TikTok videos and followers",
    color: "#000000",
    powersBlocks: ["tiktok-latest-post", "tiktok-follower-count"],
    configured: hasEnv("TIKTOK"),
  },
  {
    type: "threads",
    label: "Threads",
    icon: "threads",
    description: "Display your Threads follower count",
    color: "#101010",
    powersBlocks: ["threads-follower-count"],
    configured: hasEnv("THREADS"),
  },
  {
    type: "github",
    label: "GitHub",
    icon: "github",
    description: "Show your monthly commit activity",
    color: "#333333",
    powersBlocks: ["github-commits-this-month"],
    configured: hasEnv("GITHUB"),
  },
];

export function getProvider(type: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS.find((p) => p.type === type);
}

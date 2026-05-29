/**
 * Live data fetchers for each integration type.
 * Called by GET /api/bio/blocks/[blockId]/data.
 *
 * Each fetcher:
 *  1. Reads the decrypted token from the integration record
 *  2. Calls the platform API
 *  3. If 401, attempts token refresh, updates DB, retries once
 *  4. Returns structured data or null
 */

import { db, linkGalleryIntegrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshToken } from "@/lib/gallery/oauth";
import type { IntegrationType, OAuthTokenSet, IntegrationConfig } from "./integrations";

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function getTokensForGallery(
  galleryId: string,
  type: IntegrationType
): Promise<{ tokens: OAuthTokenSet; integrationId: string } | null> {
  const integration = await db.query.linkGalleryIntegrations.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.galleryId, galleryId), eq(i.type, type)),
  });

  if (!integration?.encryptedConfig) return null;

  try {
    const config: IntegrationConfig = JSON.parse(decrypt(integration.encryptedConfig));
    if (!config.tokens?.accessToken) return null;
    return { tokens: config.tokens, integrationId: integration.id };
  } catch {
    return null;
  }
}

async function refreshAndSave(
  integrationId: string,
  type: IntegrationType,
  tokens: OAuthTokenSet
): Promise<OAuthTokenSet | null> {
  try {
    const newTokens = await refreshToken(type, tokens);
    const newConfig: IntegrationConfig = { tokens: newTokens };
    await db
      .update(linkGalleryIntegrations)
      .set({ encryptedConfig: encrypt(JSON.stringify(newConfig)), updatedAt: new Date() })
      .where(eq(linkGalleryIntegrations.id, integrationId));
    return newTokens;
  } catch {
    return null;
  }
}

// ─── Spotify — currently playing / recently played ────────────────────────────

export interface SpotifyNowPlayingData {
  isPlayingNow: boolean;
  name: string;
  artistName: string;
  albumName: string;
  imageUrl: string;
  hyperlink: string;
}

export async function fetchSpotifyNowPlaying(
  galleryId: string
): Promise<SpotifyNowPlayingData | null> {
  const result = await getTokensForGallery(galleryId, "spotify");
  if (!result) return null;

  const { tokens, integrationId } = result;

  async function callApi(accessToken: string) {
    // Try currently playing first
    const cpRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 30 },
    });

    if (cpRes.status === 200) {
      const data = await cpRes.json();
      if (data?.item) {
        return {
          isPlayingNow: data.is_playing ?? false,
          name: data.item.name,
          artistName: data.item.artists?.map((a: any) => a.name).join(", ") ?? "",
          albumName: data.item.album?.name ?? "",
          imageUrl: data.item.album?.images?.[0]?.url ?? "",
          hyperlink: data.item.external_urls?.spotify ?? "",
        };
      }
    }

    if (cpRes.status === 401) return null; // signal refresh needed

    // Fall back to recently played
    const rpRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 60 } }
    );

    if (rpRes.ok) {
      const data = await rpRes.json();
      const track = data?.items?.[0]?.track;
      if (track) {
        return {
          isPlayingNow: false,
          name: track.name,
          artistName: track.artists?.map((a: any) => a.name).join(", ") ?? "",
          albumName: track.album?.name ?? "",
          imageUrl: track.album?.images?.[0]?.url ?? "",
          hyperlink: track.external_urls?.spotify ?? "",
        };
      }
    }

    return null;
  }

  let data = await callApi(tokens.accessToken);

  // Token expired — try refresh
  if (data === null && tokens.refreshToken) {
    const newTokens = await refreshAndSave(integrationId, "spotify", tokens);
    if (newTokens) {
      data = await callApi(newTokens.accessToken);
    }
  }

  return data;
}

// ─── Instagram — follower count ───────────────────────────────────────────────

export interface InstagramFollowerData {
  followerCount: number;
  profile: {
    username: string;
    name: string;
    profilePictureUrl: string;
  };
}

export async function fetchInstagramFollowers(
  galleryId: string
): Promise<InstagramFollowerData | null> {
  const result = await getTokensForGallery(galleryId, "instagram");
  if (!result) return null;

  const { tokens, integrationId } = result;

  async function callApi(accessToken: string) {
    const fields = "followers_count,username,name,profile_picture_url";
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=${fields}&access_token=${accessToken}`,
      { next: { revalidate: 300 } }
    );
    if (res.status === 401) return null;
    if (!res.ok) return undefined; // other error — don't retry
    const data = await res.json();
    if (!data.username) return undefined;
    return {
      followerCount: data.followers_count ?? 0,
      profile: {
        username: data.username,
        name: data.name ?? data.username,
        profilePictureUrl: data.profile_picture_url ?? "",
      },
    };
  }

  let data = await callApi(tokens.accessToken);
  if (data === null && tokens.refreshToken) {
    const newTokens = await refreshAndSave(integrationId, "instagram", tokens);
    if (newTokens) data = await callApi(newTokens.accessToken);
  }
  return data ?? null;
}

// ─── Instagram — latest posts ─────────────────────────────────────────────────

export interface InstagramPost {
  id: string;
  imageUrl: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption?: string;
  timestamp: string;
  link: string;
  username: string;
}

export async function fetchInstagramLatestPosts(
  galleryId: string,
  numberOfPosts = 1
): Promise<InstagramPost[] | null> {
  const result = await getTokensForGallery(galleryId, "instagram");
  if (!result) return null;

  const { tokens, integrationId } = result;

  async function callApi(accessToken: string) {
    const fields = "id,media_type,media_url,thumbnail_url,caption,timestamp,permalink,username";
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me/media?fields=${fields}&limit=${numberOfPosts}&access_token=${accessToken}`,
      { next: { revalidate: 300 } }
    );
    if (res.status === 401) return null;
    if (!res.ok) return undefined;
    const data = await res.json();
    const items = data?.data ?? [];
    return items.map((item: any) => ({
      id: item.id,
      imageUrl: item.media_url ?? item.thumbnail_url ?? "",
      mediaType: item.media_type ?? "IMAGE",
      caption: item.caption,
      timestamp: item.timestamp,
      link: item.permalink ?? "",
      username: item.username ?? "",
    }));
  }

  let data = await callApi(tokens.accessToken);
  if (data === null && tokens.refreshToken) {
    const newTokens = await refreshAndSave(integrationId, "instagram", tokens);
    if (newTokens) data = await callApi(newTokens.accessToken);
  }
  return data ?? null;
}

// ─── TikTok — follower count ──────────────────────────────────────────────────

export interface TikTokFollowerData {
  followerCount: number;
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export async function fetchTikTokFollowers(
  galleryId: string
): Promise<TikTokFollowerData | null> {
  const result = await getTokensForGallery(galleryId, "tiktok");
  if (!result) return null;

  const { tokens, integrationId } = result;

  async function callApi(accessToken: string) {
    const fields = "avatar_url,display_name,follower_count,username";
    const res = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: { revalidate: 300 },
      }
    );
    if (res.status === 401) return null;
    if (!res.ok) return undefined;
    const body = await res.json();
    const user = body?.data?.user;
    if (!user) return undefined;
    return {
      followerCount: user.follower_count ?? 0,
      profile: {
        username: user.username ?? "",
        displayName: user.display_name ?? user.username ?? "",
        avatarUrl: user.avatar_url ?? "",
      },
    };
  }

  let data = await callApi(tokens.accessToken);
  if (data === null && tokens.refreshToken) {
    const newTokens = await refreshAndSave(integrationId, "tiktok", tokens);
    if (newTokens) data = await callApi(newTokens.accessToken);
  }
  return data ?? null;
}

// ─── TikTok — latest video ────────────────────────────────────────────────────

export interface TikTokVideo {
  id: string;
  title: string;
  coverImageUrl: string;
  embedLink: string;
}

export async function fetchTikTokLatestVideo(
  galleryId: string
): Promise<TikTokVideo | null> {
  const result = await getTokensForGallery(galleryId, "tiktok");
  if (!result) return null;

  const { tokens, integrationId } = result;

  async function callApi(accessToken: string) {
    const fields = "id,title,cover_image_url,embed_link";
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 1 }),
        next: { revalidate: 300 },
      }
    );
    if (res.status === 401) return null;
    if (!res.ok) return undefined;
    const body = await res.json();
    const video = body?.data?.videos?.[0];
    if (!video) return undefined;
    return {
      id: video.id,
      title: video.title ?? "",
      coverImageUrl: video.cover_image_url ?? "",
      embedLink: video.embed_link ?? "",
    };
  }

  let data = await callApi(tokens.accessToken);
  if (data === null && tokens.refreshToken) {
    const newTokens = await refreshAndSave(integrationId, "tiktok", tokens);
    if (newTokens) data = await callApi(newTokens.accessToken);
  }
  return data ?? null;
}

// ─── Threads — follower count ─────────────────────────────────────────────────

export interface ThreadsFollowerData {
  followerCount: number;
  profile: {
    username: string;
    name: string;
    profilePictureUrl: string;
  };
}

export async function fetchThreadsFollowers(
  galleryId: string
): Promise<ThreadsFollowerData | null> {
  const result = await getTokensForGallery(galleryId, "threads");
  if (!result) return null;

  const { tokens, integrationId } = result;

  async function callApi(accessToken: string) {
    // Get user ID first
    const meRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`,
      { next: { revalidate: 300 } }
    );
    if (meRes.status === 401) return null;
    if (!meRes.ok) return undefined;
    const me = await meRes.json();

    // Get follower count
    const insightsRes = await fetch(
      `https://graph.threads.net/v1.0/${me.id}/threads_insights?metric=followers_count&access_token=${accessToken}`,
      { next: { revalidate: 300 } }
    );
    if (!insightsRes.ok) return undefined;
    const insights = await insightsRes.json();
    const followerCount = insights?.data?.[0]?.total_value?.value ?? 0;

    return {
      followerCount,
      profile: {
        username: me.username ?? "",
        name: me.name ?? me.username ?? "",
        profilePictureUrl: me.threads_profile_picture_url ?? "",
      },
    };
  }

  let data = await callApi(tokens.accessToken);
  if (data === null && tokens.refreshToken) {
    const newTokens = await refreshAndSave(integrationId, "threads", tokens);
    if (newTokens) data = await callApi(newTokens.accessToken);
  }
  return data ?? null;
}

// ─── Legacy compat — getBlockSyncFn ──────────────────────────────────────────
// Used by /api/gallery/sync/[blockId]/route.ts (old route, kept for backwards
// compat). Returns a function that accepts an accessToken and returns data,
// or null if the block type has no sync handler.

type SyncFn = (accessToken: string) => Promise<Record<string, unknown>>;

export function getBlockSyncFn(blockType: string): SyncFn | null {
  switch (blockType) {
    case "spotify-playing-now":
      return async (accessToken) => {
        const res = await fetch(
          "https://api.spotify.com/v1/me/player/currently-playing",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return {};
        const d = await res.json();
        if (!d?.item) return {};
        return {
          isPlayingNow: d.is_playing ?? false,
          name: d.item.name,
          artistName: d.item.artists?.map((a: { name: string }) => a.name).join(", ") ?? "",
          albumName: d.item.album?.name ?? "",
          imageUrl: d.item.album?.images?.[0]?.url ?? "",
          hyperlink: d.item.external_urls?.spotify ?? "",
        };
      };

    case "instagram-follower-count":
      return async (accessToken) => {
        const res = await fetch(
          `https://graph.instagram.com/v21.0/me?fields=followers_count,username,name,profile_picture_url&access_token=${accessToken}`
        );
        if (!res.ok) return {};
        return res.json();
      };

    case "tiktok-follower-count":
      return async (accessToken) => {
        const res = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=avatar_url,display_name,follower_count,username",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return {};
        const body = await res.json();
        return body?.data?.user ?? {};
      };

    default:
      return null;
  }
}

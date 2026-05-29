"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Unlink, AlertCircle } from "lucide-react";
import type { BlockFormProps } from "./formRegistry";

// Integration forms use the full BlockFormProps but only need onCancel
type IntegrationFormProps = BlockFormProps;

// ─── Connected integration shape ─────────────────────────────────────────────

interface ConnectedIntegration {
  id: string;
  type: string;
  displayName: string;
  createdAt: string;
}

// ─── Shared connect/disconnect UI ────────────────────────────────────────────

interface IntegrationConnectProps {
  /** Provider type key matching INTEGRATION_PROVIDERS */
  providerType: string;
  /** Display name shown in the UI */
  providerName: string;
  /** Short description */
  description: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Blocks this integration powers */
  powersBlocks: string[];
  onCancel: () => void;
}

function IntegrationConnect({
  providerType,
  providerName,
  description,
  icon,
  powersBlocks,
  onCancel,
}: IntegrationConnectProps) {
  const [connected, setConnected] = useState<ConnectedIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Fetch current connection status ─────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/gallery/integrations");
      if (!res.ok) return;
      const { integrations } = await res.json();
      const match = (integrations as ConnectedIntegration[]).find(
        (i) => i.type === providerType
      );
      setConnected(match ?? null);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, [providerType]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Connect ─────────────────────────────────────────────────────────────────
  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/gallery/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: providerType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start OAuth flow");
        return;
      }
      if (data.url) {
        // Open OAuth in popup
        const popup = window.open(
          data.url,
          `oauth_${providerType}`,
          "width=600,height=700,noopener,noreferrer"
        );
        // Poll for popup close then refresh status
        const poll = setInterval(() => {
          if (popup?.closed) {
            clearInterval(poll);
            fetchStatus();
          }
        }, 500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!connected) return;
    if (!confirm(`Disconnect ${providerName}? This block will stop showing live data.`)) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/gallery/integrations/${connected.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnected(null);
        setSuccess(`${providerName} disconnected`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Failed to disconnect. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Provider card */}
      <div className="flex flex-col items-center text-center px-4 py-6 bg-stone-50 rounded-xl border border-stone-200">
        <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-3 shadow-sm">
          {icon}
        </div>
        <p className="font-semibold text-stone-800 mb-1">{providerName}</p>
        <p className="text-xs text-stone-500 text-pretty mb-3">{description}</p>

        {/* Powers blocks */}
        <div className="flex flex-wrap gap-1 justify-center mb-4">
          {powersBlocks.map((b) => (
            <span
              key={b}
              className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full"
            >
              {b.replace(/-/g, " ")}
            </span>
          ))}
        </div>

        {/* Status + action */}
        {connected ? (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Connected
            </div>
            <p className="text-xs text-stone-400">
              Connected on {new Date(connected.createdAt).toLocaleDateString()}
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              Disconnect {providerName}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Connect {providerName}
          </button>
        )}
      </div>

      {/* Error / success */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-stone-500 hover:text-stone-700 transition-colors cursor-pointer text-center"
      >
        ← Back to blocks
      </button>
    </div>
  );
}

// ─── Provider icons ───────────────────────────────────────────────────────────

function SpotifyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 496 512" fill="#1DB954">
      <path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
      <path fill="#000" d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#ig-form)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="ig-form" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 512 512" fill="currentColor">
      <path d="M412.19 118.66a109.27 109.27 0 0 1-9.45-5.5 132.87 132.87 0 0 1-24.27-20.62c-18.1-20.71-24.86-41.72-27.35-56.43h.1C349.14 23.9 350 16 350.13 16h-82.44v318.78c0 4.28 0 8.51-.18 12.69 0 .52-.05 1-.08 1.56 0 .23 0 .47-.05.71v.18a70 70 0 0 1-35.22 55.56 68.8 68.8 0 0 1-34.11 9c-38.41 0-69.54-31.32-69.54-70s31.13-70 69.54-70a68.9 68.9 0 0 1 21.41 3.39l.1-83.94a153.14 153.14 0 0 0-118 34.52 161.79 161.79 0 0 0-35.3 43.53c-3.48 6-16.61 30.11-18.2 69.24-1 22.21 5.67 45.22 8.85 54.73v.2c2 5.6 9.75 24.71 22.38 40.82A167.53 167.53 0 0 0 115 470.66v-.2l.2.2c39.91 27.12 84.16 25.34 84.16 25.34 7.66-.31 33.32 0 62.46-13.81 32.32-15.31 50.72-38.12 50.72-38.12a158.46 158.46 0 0 0 27.64-45.93c7.46-19.61 9.95-43.13 9.95-52.53V176.49c1 .6 14.32 9.41 14.32 9.41s19.19 12.3 49.13 20.31c21.48 5.7 50.42 6.9 50.42 6.9v-81.84c-10.14 1.1-30.73-2.1-51.81-12.61Z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 192 192" fill="currentColor">
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.194 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553ZM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.397-7.442 5.296-15.746 22.461-16.735 1.966-.114 3.895-.169 5.79-.169 6.235 0 12.068.606 17.371 1.765-1.978 24.702-13.58 28.713-23.802 29.274Z" />
    </svg>
  );
}

// ─── Per-provider form exports ────────────────────────────────────────────────

export function SpotifyPlayingForm({ onCancel }: IntegrationFormProps) {
  return (
    <IntegrationConnect
      providerType="spotify"
      providerName="Spotify"
      description="Show what you're currently listening to or recently played tracks."
      icon={<SpotifyIcon />}
      powersBlocks={["spotify-playing-now", "spotify-embed"]}
      onCancel={onCancel}
    />
  );
}

export function InstagramLatestForm({ onCancel }: IntegrationFormProps) {
  return (
    <IntegrationConnect
      providerType="instagram"
      providerName="Instagram"
      description="Display your latest posts. Requires a Business or Creator account."
      icon={<InstagramIcon />}
      powersBlocks={["instagram-latest-post", "instagram-follower-count"]}
      onCancel={onCancel}
    />
  );
}

export function InstagramFollowersForm({ onCancel }: IntegrationFormProps) {
  return (
    <IntegrationConnect
      providerType="instagram"
      providerName="Instagram"
      description="Show your follower count. Requires a Business or Creator account."
      icon={<InstagramIcon />}
      powersBlocks={["instagram-latest-post", "instagram-follower-count"]}
      onCancel={onCancel}
    />
  );
}

export function TikTokLatestForm({ onCancel }: IntegrationFormProps) {
  return (
    <IntegrationConnect
      providerType="tiktok"
      providerName="TikTok"
      description="Display your latest TikTok video on your bio page."
      icon={<TikTokIcon />}
      powersBlocks={["tiktok-latest-post", "tiktok-follower-count"]}
      onCancel={onCancel}
    />
  );
}

export function TikTokFollowersForm({ onCancel }: IntegrationFormProps) {
  return (
    <IntegrationConnect
      providerType="tiktok"
      providerName="TikTok"
      description="Show your TikTok follower count on your bio page."
      icon={<TikTokIcon />}
      powersBlocks={["tiktok-latest-post", "tiktok-follower-count"]}
      onCancel={onCancel}
    />
  );
}

export function ThreadsFollowersForm({ onCancel }: IntegrationFormProps) {
  return (
    <IntegrationConnect
      providerType="threads"
      providerName="Threads"
      description="Show your Threads follower count on your bio page."
      icon={<ThreadsIcon />}
      powersBlocks={["threads-follower-count"]}
      onCancel={onCancel}
    />
  );
}

// ─── Reactions (no OAuth needed) ─────────────────────────────────────────────

export function ReactionsForm({ onCancel }: IntegrationFormProps) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-8 bg-stone-50 rounded-xl border border-stone-200">
      <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-3 shadow-sm text-3xl">
        ❤️
      </div>
      <p className="font-semibold text-stone-800 mb-1">Reactions</p>
      <p className="text-xs text-stone-500 text-pretty">
        No connection needed. Visitors can tap the heart to react to your page. Reactions are stored automatically.
      </p>
    </div>
  );
}

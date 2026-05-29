"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ExternalLink, Unlink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "@/lib/gallery/integrations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectedIntegration {
  id: string;
  type: string;
  displayName: string;
  createdAt: string;
}

// ─── Provider icons (inline SVG — no emoji) ───────────────────────────────────

function ProviderIcon({ type, size = 20 }: { type: string; size?: number }) {
  switch (type) {
    case "spotify":
      return (
        <svg width={size} height={size} viewBox="0 0 496 512" fill="#1DB954">
          <path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
          <path fill="#000" d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
        </svg>
      );
    case "instagram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="url(#ig-sidebar)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="ig-sidebar" x1="0%" y1="100%" x2="100%" y2="0%">
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
    case "tiktok":
      return (
        <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor">
          <path d="M412.19 118.66a109.27 109.27 0 0 1-9.45-5.5 132.87 132.87 0 0 1-24.27-20.62c-18.1-20.71-24.86-41.72-27.35-56.43h.1C349.14 23.9 350 16 350.13 16h-82.44v318.78c0 4.28 0 8.51-.18 12.69 0 .52-.05 1-.08 1.56 0 .23 0 .47-.05.71v.18a70 70 0 0 1-35.22 55.56 68.8 68.8 0 0 1-34.11 9c-38.41 0-69.54-31.32-69.54-70s31.13-70 69.54-70a68.9 68.9 0 0 1 21.41 3.39l.1-83.94a153.14 153.14 0 0 0-118 34.52 161.79 161.79 0 0 0-35.3 43.53c-3.48 6-16.61 30.11-18.2 69.24-1 22.21 5.67 45.22 8.85 54.73v.2c2 5.6 9.75 24.71 22.38 40.82A167.53 167.53 0 0 0 115 470.66v-.2l.2.2c39.91 27.12 84.16 25.34 84.16 25.34 7.66-.31 33.32 0 62.46-13.81 32.32-15.31 50.72-38.12 50.72-38.12a158.46 158.46 0 0 0 27.64-45.93c7.46-19.61 9.95-43.13 9.95-52.53V176.49c1 .6 14.32 9.41 14.32 9.41s19.19 12.3 49.13 20.31c21.48 5.7 50.42 6.9 50.42 6.9v-81.84c-10.14 1.1-30.73-2.1-51.81-12.61Z" />
        </svg>
      );
    case "threads":
      return (
        <svg width={size} height={size} viewBox="0 0 192 192" fill="currentColor">
          <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.194 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553ZM98.44 129.507c-10.44.588-21.286-4.098-21.82-14.135-.397-7.442 5.296-15.746 22.461-16.735 1.966-.114 3.895-.169 5.79-.169 6.235 0 12.068.606 17.371 1.765-1.978 24.702-13.58 28.713-23.802 29.274Z" />
        </svg>
      );
    case "github":
      return (
        <svg width={size} height={size} viewBox="0 0 98 96" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
        </svg>
      );
    default:
      return <span className="text-base">{type[0].toUpperCase()}</span>;
  }
}

// ─── Integration row ──────────────────────────────────────────────────────────

function IntegrationRow({
  provider,
  connected,
  onConnect,
  onDisconnect,
  connecting,
  disconnecting,
  checkingStatus,
}: {
  provider: IntegrationProvider;
  connected: ConnectedIntegration | null;
  onConnect: (type: string) => void;
  onDisconnect: (id: string) => void;
  connecting: boolean;
  disconnecting: boolean;
  checkingStatus?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-200">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${provider.color}18` }}
      >
        <ProviderIcon type={provider.type} size={20} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-stone-900">{provider.label}</p>
          {connected && (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-stone-500 truncate">
          {checkingStatus
            ? "Checking status…"
            : connected
            ? `Connected · powers ${provider.powersBlocks.length} block${provider.powersBlocks.length !== 1 ? "s" : ""}`
            : provider.description}
        </p>
      </div>

      {/* Action — show a faint placeholder while we're still verifying
          whether the user is connected. Prevents flash of "Connect"
          followed by a switch to "Disconnect" once GET resolves. */}
      {checkingStatus ? (
        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-100 text-stone-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading</span>
        </div>
      ) : connected ? (
        <button
          type="button"
          onClick={() => onDisconnect(connected.id)}
          disabled={disconnecting}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
          title="Disconnect"
        >
          {disconnecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Unlink className="w-3 h-3" />
          )}
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onConnect(provider.type)}
          disabled={connecting || !provider.configured}
          title={!provider.configured ? "Not configured — add env vars" : `Connect ${provider.label}`}
          className={cn(
            "shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            provider.configured
              ? "border-stone-200 text-stone-600 hover:bg-stone-50"
              : "border-stone-100 text-stone-400"
          )}
        >
          {connecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ExternalLink className="w-3 h-3" />
          )}
          {provider.configured ? "Connect" : "Not set up"}
        </button>
      )}
    </div>
  );
}

// ─── SidebarIntegrations ──────────────────────────────────────────────────────

export function SidebarIntegrations() {
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Fetch connected integrations ────────────────────────────────────────────
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/gallery/integrations");
      if (!res.ok) return;
      const { integrations: data } = await res.json();
      setIntegrations(data ?? []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // ── Handle OAuth success/error from URL params ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const integration = params.get("integration");
    const provider = params.get("provider");
    if (!integration) return;

    if (integration === "success") {
      setToast({ message: `${provider ?? "Integration"} connected successfully`, type: "success" });
      fetchIntegrations();
    } else if (integration === "error" || integration === "token_exchange_failed") {
      setToast({ message: `Failed to connect ${provider ?? "integration"}. Please try again.`, type: "error" });
    }

    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete("integration");
    url.searchParams.delete("provider");
    window.history.replaceState({}, "", url.toString());
  }, [fetchIntegrations]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Connect ─────────────────────────────────────────────────────────────────
  async function handleConnect(type: string) {
    setConnectingType(type);
    try {
      const res = await fetch("/api/gallery/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.error ?? "Failed to start OAuth flow", type: "error" });
        return;
      }

      // Open OAuth URL in a new tab
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer,width=600,height=700");
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setConnectingType(null);
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect(integrationId: string) {
    if (!confirm("Disconnect this integration? Live data blocks using it will stop updating.")) return;
    setDisconnectingId(integrationId);
    try {
      const res = await fetch(`/api/gallery/integrations/${integrationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
        setToast({ message: "Integration disconnected", type: "success" });
      } else {
        setToast({ message: "Failed to disconnect. Please try again.", type: "error" });
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setDisconnectingId(null);
    }
  }

  // ── Build connected map ─────────────────────────────────────────────────────
  const connectedMap = new Map<string, ConnectedIntegration>();
  for (const i of integrations) {
    connectedMap.set(i.type, i);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
        <h2 className="text-sm font-semibold text-stone-900">Integrations</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Connect accounts to power live data blocks
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "mx-3 mt-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2",
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {/* Render provider rows immediately with a "checking…" indicator
            instead of grey skeletons. Users see the actual layout right
            away and just learn whether each one is connected as soon as
            the GET resolves. Far less jarring than a blank skeleton. */}
        {INTEGRATION_PROVIDERS.map((provider) => (
          <IntegrationRow
            key={provider.type}
            provider={provider}
            connected={connectedMap.get(provider.type) ?? null}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            connecting={connectingType === provider.type}
            disconnecting={disconnectingId === (connectedMap.get(provider.type)?.id ?? "")}
            checkingStatus={loading}
          />
        ))}

        {/* Hint */}
        <p className="text-xs text-stone-400 text-center pt-1 pb-2">
          After connecting, add the matching block to your canvas to display live data.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Loader2, ExternalLink, LogOut, RefreshCw } from "lucide-react";

export default function WebhooksSettingsPage() {
  const { workspace } = useWorkspace();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiring, setExpiring] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const fetchPortalUrl = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/svix/portal-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, sessionId, darkMode: "auto" }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to load portal");
      }
      const data = await res.json();
      setPortalUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, sessionId]);

  useEffect(() => {
    fetchPortalUrl();
  }, [fetchPortalUrl]);

  const handleExpireAll = async () => {
    if (!workspace?.id) return;
    setExpiring(true);
    try {
      const res = await fetch("/api/svix/expire-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, sessionId, expiry: 0 }),
      });
      if (!res.ok) throw new Error("Failed to expire sessions");
      await fetchPortalUrl();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to expire sessions");
    } finally {
      setExpiring(false);
    }
  };

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Manage webhook endpoints and event subscriptions for {workspace.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpireAll}
            disabled={expiring}
          >
            {expiring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            Expire sessions
          </Button>
          {portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </a>
          )}
        </div>
      </div>

      {/* Portal iframe */}
      {loading && (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPortalUrl}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {portalUrl && !loading && (
        <div className="flex-1 overflow-hidden">
          <iframe
            src={portalUrl}
            className="w-full h-full border-0"
            title="Svix Webhook Portal"
            allow="clipboard-write"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

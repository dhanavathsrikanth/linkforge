"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { Loader2, ExternalLink } from "lucide-react";

export default function WebhooksSettingsPage() {
  const { workspace } = useWorkspace();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace?.id) return;

    setLoading(true);
    setError(null);

    fetch("/api/svix/portal-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load portal");
        }
        return res.json();
      })
      .then((data) => {
        setPortalUrl(data.url);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspace?.id]);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Manage webhook endpoints and event subscriptions for {workspace.name}
          </p>
        </div>
        {portalUrl && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Open in new tab
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {portalUrl && (
        <iframe
          src={portalUrl}
          className="flex-1 w-full border border-border rounded-lg min-h-[600px]"
          title="Svix Webhook Portal"
        />
      )}
    </div>
  );
}

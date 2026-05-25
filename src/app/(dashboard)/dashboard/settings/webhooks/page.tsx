"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ExternalLink,
  Moon,
  Sun,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
} from "lucide-react";

type PortalOptions = {
  darkMode: "false" | "true" | "auto";
  readOnly: boolean;
  next: string;
};

export default function WebhooksSettingsPage() {
  const { workspace } = useWorkspace();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiring, setExpiring] = useState(false);
  const [options, setOptions] = useState<PortalOptions>({
    darkMode: "auto",
    readOnly: false,
    next: "",
  });

  const fetchPortalUrl = useCallback(async () => {
    if (!workspace?.id) return;

    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = { workspaceId: workspace.id };
    if (options.darkMode !== "false") body.darkMode = options.darkMode;
    if (options.readOnly) {
      body.capabilities = ["ViewBase"];
    }
    if (options.next) body.next = options.next;

    try {
      const res = await fetch("/api/svix/portal-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [workspace?.id, options]);

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
        body: JSON.stringify({ workspaceId: workspace.id }),
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          variant={options.darkMode === "true" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setOptions((prev) => ({
              ...prev,
              darkMode: prev.darkMode === "true" ? "false" : "true",
            }))
          }
        >
          {options.darkMode === "true" ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
          {options.darkMode === "true" ? "Dark" : options.darkMode === "auto" ? "Auto" : "Light"}
        </Button>

        <Button
          variant={options.readOnly ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setOptions((prev) => ({ ...prev, readOnly: !prev.readOnly }))
          }
        >
          {options.readOnly ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {options.readOnly ? "Read-only" : "Full access"}
        </Button>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Page path (e.g. /endpoints/abc)"
            value={options.next}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, next: e.target.value }))
            }
            className="w-64 h-8 text-xs"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPortalUrl}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Apply
        </Button>

        <Separator orientation="vertical" className="h-6" />

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
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPortalUrl}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {portalUrl && !loading && (
        <iframe
          src={portalUrl}
          className="flex-1 w-full border border-border rounded-lg min-h-[600px]"
          title="Svix Webhook Portal"
        />
      )}
    </div>
  );
}

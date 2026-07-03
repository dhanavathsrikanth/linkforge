"use client";

import { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TrustBadge, type TrustBand } from "@/components/safety/TrustBadge";

interface AbuseLink {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  workspaceId: string;
  workspaceName: string | null;
  safetyStatus: string;
  safetyScanId: string | null;
  safetyTrustScore: number | null;
  safetyTrustBand: TrustBand;
  safetyScannedAt: string | null;
  safetyBlockedByAdmin: boolean;
  assetRiskFlagCount: number;
}

interface AbuseResponse {
  total: number;
  isPlatformAdmin: boolean;
  links: AbuseLink[];
}

export function AbuseDashboardClient() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;
  const qc = useQueryClient();
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery<AbuseResponse>({
    queryKey: ["abuse-dashboard", workspaceId],
    queryFn: async () => {
      const url = new URL("/api/url-scanner/abuse", window.location.origin);
      if (workspaceId) url.searchParams.set("workspaceId", workspaceId);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load");
      }
      return res.json();
    },
    enabled: !!workspaceId,
  });

  async function handleAction(
    linkId: string,
    action: "block" | "unblock" | "rescan"
  ) {
    setActionIds((s) => new Set(s).add(linkId));
    try {
      const res = await fetch("/api/url-scanner/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, action }),
      });
      if (res.status === 503) {
        toast.error("Audit logging unavailable. Action aborted.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Action failed");
        return;
      }
      const labels: Record<string, string> = {
        block: "Link blocked",
        unblock: "Link unblocked",
        rescan: "Rescan submitted",
      };
      toast.success(labels[action] ?? "Done");
      await refetch();
    } catch {
      toast.error("Network error");
    } finally {
      setActionIds((s) => {
        const next = new Set(s);
        next.delete(linkId);
        return next;
      });
    }
  }

  const links = data?.links ?? [];
  const isPlatformAdmin = data?.isPlatformAdmin ?? false;

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Abuse Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              {isPlatformAdmin
                ? "Flagged links across all workspaces."
                : "Flagged links in this workspace."}
            </p>
          </div>
        </div>
        {isPlatformAdmin && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Platform Admin
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background py-16 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-foreground">
            No flagged links
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            No links are currently flagged as malicious or blocked.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_80px_160px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Link</span>
            <span>Trust</span>
            <span>Flags</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-border">
            {links.map((link, i) => {
              const busy = actionIds.has(link.id);
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_80px_160px] gap-2 sm:gap-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Link info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {link.title || link.slug}
                      </p>
                      {link.safetyBlockedByAdmin && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 shrink-0">
                          <ShieldOff className="h-2.5 w-2.5" />
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">
                      {link.destination}
                    </p>
                    {isPlatformAdmin && link.workspaceName && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Workspace: {link.workspaceName}
                      </p>
                    )}
                  </div>

                  {/* Trust badge */}
                  <div className="flex items-center">
                    <TrustBadge
                      score={link.safetyTrustScore}
                      band={link.safetyTrustBand}
                      size="sm"
                    />
                  </div>

                  {/* Asset risk flags */}
                  <div className="text-xs text-muted-foreground">
                    {link.assetRiskFlagCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {link.assetRiskFlagCount} flag
                        {link.assetRiskFlagCount !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>

                  {/* Safety status */}
                  <div className="text-xs">
                    <span
                      className={
                        link.safetyStatus === "malicious"
                          ? "text-red-600 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {link.safetyStatus}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={`/s/${link.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Open link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        handleAction(
                          link.id,
                          link.safetyBlockedByAdmin ? "unblock" : "block"
                        )
                      }
                      disabled={busy}
                      className={`flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                        link.safetyBlockedByAdmin
                          ? "text-emerald-700 hover:bg-emerald-50"
                          : "text-red-700 hover:bg-red-50"
                      }`}
                      title={
                        link.safetyBlockedByAdmin ? "Unblock link" : "Block link"
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : link.safetyBlockedByAdmin ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldOff className="h-3.5 w-3.5" />
                      )}
                      {link.safetyBlockedByAdmin ? "Unblock" : "Block"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(link.id, "rescan")}
                      disabled={busy}
                      className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                      title="Re-scan with Cloudflare URL Scanner"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Rescan
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

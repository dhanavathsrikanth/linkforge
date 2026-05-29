"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  AlertCircle,
  Link2,
  ArrowRight,
  Sparkles,
  Ban,
  Square,
  CheckSquare,
  Search,
  X,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface SecurityInfo {
  scanId: string;
  malicious: boolean;
  categories: string[];
  phishing: string[];
  status: "pending" | "safe" | "malicious" | "error";
}

interface CheckResult {
  linkId: string;
  slug: string;
  destination: string;
  status: "ok" | "broken" | "changed";
  statusCode?: number;
  summary?: string;
  security?: SecurityInfo;
}

interface CheckResponse {
  checked: number;
  broken: number;
  changed: number;
  results: CheckResult[];
}

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
};

// ─── Security badge ───────────────────────────────────────────────────────────

function SecurityBadge({ security }: { security?: SecurityInfo }) {
  if (!security) return null;

  if (security.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Scanning
      </span>
    );
  }

  if (security.status === "malicious") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <ShieldAlert className="h-3 w-3" />
        Malicious
      </span>
    );
  }

  if (security.status === "safe") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
        <ShieldCheck className="h-3 w-3" />
        Safe
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
      <ShieldQuestion className="h-3 w-3" />
      Unknown
    </span>
  );
}

function StatusBadge({ status }: { status: CheckResult["status"] }) {
  const styles = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    broken:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    changed:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  };

  const icons = {
    ok: CheckCircle2,
    broken: XCircle,
    changed: AlertTriangle,
  };

  const labels = {
    ok: "OK",
    broken: "Broken",
    changed: "Changed",
  };

  const Icon = icons[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      <Icon className="h-3 w-3" />
      {labels[status]}
    </span>
  );
}

function RetryButton({
  linkId,
  mode,
  retryingIds,
  onRetry,
}: {
  linkId: string;
  mode: "all" | "selected";
  retryingIds: Set<string>;
  onRetry: (linkId: string, mode: "all" | "selected") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRetry(linkId, mode)}
      disabled={retryingIds.has(linkId)}
      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40"
      title="Retry this link"
    >
      {retryingIds.has(linkId) ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
    </button>
  );
}

function StatusIcon({ status }: { status: CheckResult["status"] }) {
  const icons = {
    ok: CheckCircle2,
    broken: XCircle,
    changed: AlertTriangle,
  };
  const colors = {
    ok: "text-emerald-500",
    broken: "text-red-500",
    changed: "text-amber-500",
  };
  const Icon = icons[status];
  return <Icon className={`h-5 w-5 shrink-0 ${colors[status]}`} />;
}

export default function LinkCheckerPage() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const [scanning, setScanning] = useState(false);
  const [allResults, setAllResults] = useState<CheckResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<CheckResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [scanMode, setScanMode] = useState<"all" | "selected" | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Poll pending Cloudflare security scans ─────────────────────────────
  // After results come back with security.status === "pending", poll the
  // result endpoint every 15s until all scans resolve.
  useEffect(() => {
    const allPending = [
      ...allResults.filter((r) => r.security?.status === "pending"),
      ...selectedResults.filter((r) => r.security?.status === "pending"),
    ];
    if (allPending.length === 0) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    if (pollTimerRef.current) return; // already polling

    pollTimerRef.current = setInterval(async () => {
      const pending = [
        ...allResults.filter((r) => r.security?.status === "pending"),
        ...selectedResults.filter((r) => r.security?.status === "pending"),
      ];
      if (pending.length === 0) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }

      for (const result of pending) {
        if (!result.security?.scanId) continue;
        try {
          const res = await fetch(
            `/api/url-scanner/result/${result.security.scanId}`
          );
          if (res.status === 202) continue; // still in progress
          if (!res.ok) {
            updateSecurityStatus(result.linkId, { ...result.security, status: "error" });
            continue;
          }
          const data = await res.json();
          if (data.status === "Finished" || data.status === "Failed") {
            const newStatus: SecurityInfo = {
              scanId: result.security.scanId,
              malicious: data.malicious ?? false,
              categories: data.categories ?? [],
              phishing: data.phishing ?? [],
              status: data.malicious ? "malicious" : "safe",
            };
            updateSecurityStatus(result.linkId, newStatus);
          }
        } catch {
          // Silently continue — will retry on next interval
        }
      }
    }, 15_000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [allResults, selectedResults]);

  function updateSecurityStatus(linkId: string, security: SecurityInfo) {
    setAllResults((prev) =>
      prev.map((r) => (r.linkId === linkId ? { ...r, security } : r))
    );
    setSelectedResults((prev) =>
      prev.map((r) => (r.linkId === linkId ? { ...r, security } : r))
    );
  }

  const { data: workspaceLinks = [], isLoading: linksLoading } = useQuery<LinkRow[]>({
    queryKey: ["links", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/links?workspaceId=${workspaceId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.links || [];
    },
    enabled: !!workspaceId,
  });

  const { data: allResultsData = { checked: 0, broken: 0, changed: 0, results: [] }, isLoading: allScanLoading } = useQuery<CheckResponse>({
    queryKey: ["link-checker", "all", workspaceId],
    queryFn: async () => {
      const res = await fetch("/api/ai/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error("Check failed");
      return res.json();
    },
    enabled: false,
  });

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return workspaceLinks;
    const q = searchQuery.toLowerCase();
    return workspaceLinks.filter(
      (link) =>
        link.destination.toLowerCase().includes(q) ||
        link.slug.toLowerCase().includes(q) ||
        (link.title && link.title.toLowerCase().includes(q))
    );
  }, [workspaceLinks, searchQuery]);

  const allFilteredSelected = useMemo(
    () => filteredLinks.length > 0 && filteredLinks.every((l) => selectedIds.has(l.id)),
    [filteredLinks, selectedIds]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (filteredLinks.every((l) => selectedIds.has(l.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLinks.map((l) => l.id)));
    }
  }, [filteredLinks, selectedIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const allStats = useMemo(() => {
    const total = allResults.length;
    const broken = allResults.filter((r) => r.status === "broken").length;
    const changed = allResults.filter((r) => r.status === "changed").length;
    const ok = total - broken - changed;
    return { total, ok, broken, changed };
  }, [allResults]);

  const selectedStats = useMemo(() => {
    const total = selectedResults.length;
    const broken = selectedResults.filter((r) => r.status === "broken").length;
    const changed = selectedResults.filter((r) => r.status === "changed").length;
    const ok = total - broken - changed;
    return { total, ok, broken, changed };
  }, [selectedResults]);

  const resultMap = useMemo(() => {
    const map = new Map<string, CheckResult>();
    for (const r of allResults) map.set(r.linkId, r);
    for (const r of selectedResults) map.set(r.linkId, r);
    return map;
  }, [allResults, selectedResults]);

  const handleScanAll = async () => {
    if (!workspaceId || scanning) return;
    setScanMode("all");
    setScanning(true);
    setAllResults([]);

    try {
      const res = await fetch("/api/ai/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Check failed (${res.status})`);
      }
      const data: CheckResponse = await res.json();
      setAllResults(data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check links");
    } finally {
      setScanning(false);
    }
  };

  const handleScanSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!workspaceId || scanning || ids.length === 0) return;
    setScanMode("selected");
    setScanning(true);
    setSelectedResults([]);

    try {
      const res = await fetch("/api/ai/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, linkIds: ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Check failed (${res.status})`);
      }
      const data: CheckResponse = await res.json();
      setSelectedResults(data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check links");
    } finally {
      setScanning(false);
    }
  };

  const handleRetrySingle = async (linkId: string, mode: "all" | "selected") => {
    if (!workspaceId) return;
    setRetryingIds((prev) => new Set(prev).add(linkId));
    try {
      const res = await fetch("/api/ai/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, linkIds: [linkId] }),
      });
      if (!res.ok) throw new Error("Retry failed");
      const data: CheckResponse = await res.json();
      const result = data.results[0];
      if (result) {
        if (mode === "all") {
          setAllResults((prev) => prev.map((r) => (r.linkId === linkId ? result : r)));
        } else {
          setSelectedResults((prev) => prev.map((r) => (r.linkId === linkId ? result : r)));
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry link");
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
    }
  };

  const handleRetryAllBroken = async (mode: "all" | "selected") => {
    const results = mode === "all" ? allResults : selectedResults;
    const brokenIds = results.filter((r) => r.status === "broken").map((r) => r.linkId);
    if (!workspaceId || brokenIds.length === 0) return;
    setScanning(true);
    try {
      const res = await fetch("/api/ai/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, linkIds: brokenIds }),
      });
      if (!res.ok) throw new Error("Retry failed");
      const data: CheckResponse = await res.json();
      if (mode === "all") {
        setAllResults((prev) => {
          const update = new Map(data.results.map((r) => [r.linkId, r]));
          return prev.map((r) => update.get(r.linkId) ?? r);
        });
      } else {
        setSelectedResults((prev) => {
          const update = new Map(data.results.map((r) => [r.linkId, r]));
          return prev.map((r) => update.get(r.linkId) ?? r);
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry broken links");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <SearchCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Link Checker</h1>
            <p className="text-sm text-muted-foreground">
              Scan your links for broken URLs, redirect issues, and content drift.
            </p>
          </div>
        </div>
      </div>

      {/* Scanning state */}
      {scanning && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background px-6 py-16 shadow-sm"
        >
          <div className="relative mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-primary/5"
            />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {scanMode === "selected" ? "Scanning selected links" : "Scanning all links"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Checking destinations, status codes, and content changes...
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="h-2 w-2 rounded-full bg-primary/40"
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Scan All Results ─────────────────────────────────────────────── */}
      {!scanning && scanMode === "all" && allResults.length > 0 && (
        <motion.div
          key="all-results"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <SearchCheck className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Scan All Results</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="mt-1.5 text-2xl font-bold text-foreground">{allStats.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">OK</p>
              <p className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{allStats.ok}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Broken</p>
              <p className="mt-1.5 text-2xl font-bold text-red-700 dark:text-red-300">{allStats.broken}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Changed</p>
              <p className="mt-1.5 text-2xl font-bold text-amber-700 dark:text-amber-300">{allStats.changed}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="divide-y divide-border">
              {allResults.map((result, index) => (
                <motion.div
                  key={result.linkId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
                >
                  <div className="flex flex-col gap-1.5 px-4 py-3 sm:hidden">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={result.status} />
                      <span className="truncate text-sm font-medium text-foreground">{result.slug}</span>
                      <div className="ml-auto shrink-0">
                        <StatusBadge status={result.status} />
                      </div>
                    </div>
                    <a
                      href={result.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 truncate pl-7 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="truncate">{result.destination}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="pl-7">
                      {result.status === "broken" && result.statusCode ? (
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          HTTP {result.statusCode}
                          <RetryButton
                            linkId={result.linkId}
                            mode="all"
                            retryingIds={retryingIds}
                            onRetry={handleRetrySingle}
                          />
                        </span>
                      ) : result.status === "broken" ? (
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          Connection failed
                          <RetryButton
                            linkId={result.linkId}
                            mode="all"
                            retryingIds={retryingIds}
                            onRetry={handleRetrySingle}
                          />
                        </span>
                      ) : result.status === "changed" ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {result.summary || "Content changed"}
                        </span>
                      ) : result.statusCode ? (
                        <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1.5fr_100px_80px_36px] lg:grid-cols-[40px_1fr_1.5fr_100px_120px_36px] items-center gap-3 px-4 py-2.5 border-t border-border first:border-t-0">
                    <StatusIcon status={result.status} />
                    <span className="truncate text-sm font-medium text-foreground">{result.slug}</span>
                    <a
                      href={result.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 truncate text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="truncate">{result.destination}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <StatusBadge status={result.status} />
                    {result.status === "broken" && result.statusCode ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        HTTP {result.statusCode}
                        <RetryButton
                          linkId={result.linkId}
                          mode="all"
                          retryingIds={retryingIds}
                          onRetry={handleRetrySingle}
                        />
                      </span>
                    ) : result.status === "broken" ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        Connection failed
                        <RetryButton
                          linkId={result.linkId}
                          mode="all"
                          retryingIds={retryingIds}
                          onRetry={handleRetrySingle}
                        />
                      </span>
                    ) : result.status === "changed" ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {result.summary || "Content changed"}
                      </span>
                    ) : result.statusCode ? (
                      <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                    ) : (
                      <span />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allStats.broken > 0 && (
              <button
                type="button"
                onClick={() => handleRetryAllBroken("all")}
                disabled={scanning}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Broken ({allStats.broken})
              </button>
            )}
            <button
              type="button"
              onClick={handleScanAll}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Sparkles className="h-4 w-4" />
              Scan Again
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Scan Selected Results ────────────────────────────────────────── */}
      {!scanning && scanMode === "selected" && selectedResults.length > 0 && (
        <motion.div
          key="selected-results"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600/10">
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Scan Selected Results</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Checked</p>
              <p className="mt-1.5 text-2xl font-bold text-foreground">{selectedStats.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">OK</p>
              <p className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{selectedStats.ok}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Broken</p>
              <p className="mt-1.5 text-2xl font-bold text-red-700 dark:text-red-300">{selectedStats.broken}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Changed</p>
              <p className="mt-1.5 text-2xl font-bold text-amber-700 dark:text-amber-300">{selectedStats.changed}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="divide-y divide-border">
              {selectedResults.map((result, index) => (
                <motion.div
                  key={result.linkId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
                >
                  <div className="flex flex-col gap-1.5 px-4 py-3 sm:hidden">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={result.status} />
                      <span className="truncate text-sm font-medium text-foreground">{result.slug}</span>
                      <div className="ml-auto shrink-0">
                        <StatusBadge status={result.status} />
                      </div>
                    </div>
                    <a
                      href={result.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 truncate pl-7 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="truncate">{result.destination}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="pl-7">
                      {result.status === "broken" && result.statusCode ? (
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          HTTP {result.statusCode}
                          <RetryButton
                            linkId={result.linkId}
                            mode="selected"
                            retryingIds={retryingIds}
                            onRetry={handleRetrySingle}
                          />
                        </span>
                      ) : result.status === "broken" ? (
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          Connection failed
                          <RetryButton
                            linkId={result.linkId}
                            mode="selected"
                            retryingIds={retryingIds}
                            onRetry={handleRetrySingle}
                          />
                        </span>
                      ) : result.status === "changed" ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {result.summary || "Content changed"}
                        </span>
                      ) : result.statusCode ? (
                        <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1.5fr_100px_80px_36px] items-center gap-3 px-4 py-2.5 border-t border-border first:border-t-0">
                    <StatusIcon status={result.status} />
                    <span className="truncate text-sm font-medium text-foreground">{result.slug}</span>
                    <a
                      href={result.destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 truncate text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="truncate">{result.destination}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <StatusBadge status={result.status} />
                    {result.status === "broken" && result.statusCode ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        HTTP {result.statusCode}
                        <RetryButton
                          linkId={result.linkId}
                          mode="selected"
                          retryingIds={retryingIds}
                          onRetry={handleRetrySingle}
                        />
                      </span>
                    ) : result.status === "broken" ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        Connection failed
                        <RetryButton
                          linkId={result.linkId}
                          mode="selected"
                          retryingIds={retryingIds}
                          onRetry={handleRetrySingle}
                        />
                      </span>
                    ) : result.status === "changed" ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {result.summary || "Content changed"}
                      </span>
                    ) : result.statusCode ? (
                      <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                    ) : (
                      <span />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedStats.broken > 0 && (
              <button
                type="button"
                onClick={() => handleRetryAllBroken("selected")}
                disabled={scanning}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Broken ({selectedStats.broken})
              </button>
            )}
            <button
              type="button"
              onClick={handleScanAll}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <SearchCheck className="h-4 w-4" />
              Scan All Links
            </button>
            <button
              type="button"
              onClick={handleScanSelected}
              disabled={selectedIds.size === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:shadow-xl hover:shadow-amber-600/30 disabled:opacity-50 disabled:shadow-none"
            >
              <Sparkles className="h-4 w-4" />
              Check Selected ({selectedIds.size})
            </button>
          </div>
        </motion.div>
      )}

      {/* ── New scan — no results yet ────────────────────────────────────── */}
      {!scanning && scanMode === null && workspaceLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter links..."
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScanAll}
                disabled={!workspaceId || scanning}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
              >
                <SearchCheck className="h-4 w-4" />
                Scan All Links
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleScanSelected}
                  disabled={!workspaceId || scanning}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:shadow-xl hover:shadow-amber-600/30 disabled:opacity-50 disabled:shadow-none"
                >
                  <Sparkles className="h-4 w-4" />
                  Check Selected ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="border-b border-border bg-muted/50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Links ({filteredLinks.length})
              </span>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Clear selection
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-2 py-3 font-medium">Slug</th>
                  <th className="px-2 py-3 font-medium hidden sm:table-cell">Destination</th>
                  <th className="px-2 py-3 font-medium hidden lg:table-cell w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => {
                  const isSelected = selectedIds.has(link.id);
                  const checked = resultMap.get(link.id);
                  return (
                    <tr
                      key={link.id}
                      className={`border-b border-border transition-colors ${
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="w-10 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelect(link.id)}
                          aria-label={isSelected ? "Deselect link" : "Select link"}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-sm font-medium text-foreground">
                            {link.slug}
                          </span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-2 py-3">
                        <a
                          href={link.destination}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-1 truncate max-w-md text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="truncate">{link.destination}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>
                      <td className="hidden lg:table-cell px-2 py-3 w-28">
                        {checked ? (
                          <StatusBadge status={checked.status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Not checked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading state */}
      {linksLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!scanning && !linksLoading && workspaceLinks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-20"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 mb-4">
            <Link2 className="h-7 w-7 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No links to check</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Your workspace doesn&apos;t have any links yet. Create some links first, then run the checker.
          </p>
        </motion.div>
      )}
    </div>
  );
}

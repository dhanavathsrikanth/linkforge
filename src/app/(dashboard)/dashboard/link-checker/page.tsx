"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  SearchCheck, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, AlertCircle, Link2, Sparkles, Square, CheckSquare,
  Search, X, RefreshCw, Shield, ShieldAlert, ShieldCheck, ShieldX,
  Globe, Cpu, Zap, ArrowRight, ChevronDown, ChevronUp, Activity,
} from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CloudflareScanData {
  safetyStatus: string | null;
  safetyTrustScore: number | null;
  safetyTrustBand: string | null;
  safetyScannedAt: string | null;
  safetyVerdict: {
    malicious: boolean;
    categories?: string[];
    phishing?: string[];
    domain?: string;
    country?: string;
    asn?: string;
    asnName?: string;
    technologies?: { name: string; categories: string[] }[];
  } | null;
  redirectChain?: { url: string; status: number; ip?: string; country?: string }[] | null;
  performance?: { ttfbMs?: number; fcpMs?: number; loadMs?: number } | null;
  pageIp?: string | null;
  pageCountry?: string | null;
  pageServer?: string | null;
  radarRank?: number | null;
  contactedDomains?: string[] | null;
}

interface CheckResult {
  linkId: string;
  slug: string;
  destination: string;
  status: "ok" | "broken" | "changed";
  statusCode?: number;
  summary?: string;
  cloudflare?: CloudflareScanData;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CheckResult["status"] }) {
  const styles = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    broken: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    changed: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  };
  const icons = { ok: CheckCircle2, broken: XCircle, changed: AlertTriangle };
  const labels = { ok: "OK", broken: "Broken", changed: "Changed" };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      <Icon className="h-3 w-3" />
      {labels[status]}
    </span>
  );
}

function SafetyBadge({ status, trustScore }: { status: string | null; trustScore: number | null }) {
  if (!status || status === "unknown") return null;
  const cfg: Record<string, { label: string; cls: string; Icon: typeof Shield }> = {
    safe:       { label: "Safe",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800", Icon: ShieldCheck },
    pending:    { label: "Scanning…",  cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",     Icon: Shield },
    suspicious: { label: "Suspicious", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", Icon: ShieldAlert },
    malicious:  { label: "Malicious",  cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",           Icon: ShieldX },
    error:      { label: "Scan error", cls: "bg-muted text-muted-foreground border-border",                                                              Icon: AlertCircle },
  };
  const c = cfg[status] ?? cfg.error;
  const { Icon } = c;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.cls}`}>
      <Icon className="h-3 w-3" />
      {c.label}
      {trustScore !== null && status !== "pending" && (
        <span className="ml-0.5 opacity-70">· {trustScore}</span>
      )}
    </span>
  );
}

function TrustBar({ score, band }: { score: number | null; band: string | null }) {
  if (score === null) return null;
  const pct = Math.max(0, Math.min(100, score));
  const color =
    band === "verified" || band === "high" ? "bg-emerald-500"
    : band === "medium" ? "bg-amber-500"
    : band === "low" ? "bg-red-500"
    : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}/100</span>
    </div>
  );
}

function RetryButton({ linkId, mode, retryingIds, onRetry }: {
  linkId: string; mode: "all" | "selected"; retryingIds: Set<string>;
  onRetry: (id: string, mode: "all" | "selected") => void;
}) {
  return (
    <button type="button" onClick={() => onRetry(linkId, mode)} disabled={retryingIds.has(linkId)}
      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40" title="Retry">
      {retryingIds.has(linkId) ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
    </button>
  );
}

// ─── Cloudflare detail panel ──────────────────────────────────────────────────

function CloudflarePanel({ cf }: { cf: CloudflareScanData }) {
  const [open, setOpen] = useState(false);
  const hasData =
    cf.safetyStatus && cf.safetyStatus !== "unknown" && cf.safetyStatus !== "pending";
  if (!hasData) return null;

  const techs = cf.safetyVerdict?.technologies ?? [];
  const cats = cf.safetyVerdict?.categories ?? [];
  const redirects = cf.redirectChain ?? [];
  const perf = cf.performance;

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Cloudflare scan details
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
          {/* Server info row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {cf.pageIp && (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{cf.pageIp}</span>
            )}
            {cf.pageCountry && (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{cf.pageCountry}</span>
            )}
            {cf.pageServer && (
              <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{cf.pageServer}</span>
            )}
            {cf.radarRank && (
              <span className="flex items-center gap-1"><Activity className="h-3 w-3" />Radar rank #{cf.radarRank.toLocaleString()}</span>
            )}
          </div>

          {/* Performance */}
          {perf && (perf.ttfbMs || perf.fcpMs || perf.loadMs) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {perf.ttfbMs !== undefined && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3 text-amber-500" />TTFB <span className="font-medium text-foreground">{perf.ttfbMs}ms</span>
                </span>
              )}
              {perf.fcpMs !== undefined && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  FCP <span className="font-medium text-foreground">{perf.fcpMs}ms</span>
                </span>
              )}
              {perf.loadMs !== undefined && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  Load <span className="font-medium text-foreground">{perf.loadMs}ms</span>
                </span>
              )}
            </div>
          )}

          {/* Categories */}
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cats.slice(0, 6).map((c) => (
                <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{c}</span>
              ))}
            </div>
          )}

          {/* Technologies */}
          {techs.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Technologies</p>
              <div className="flex flex-wrap gap-1">
                {techs.slice(0, 8).map((t) => (
                  <span key={t.name} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-foreground">{t.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Redirect chain */}
          {redirects.length > 1 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Redirect chain ({redirects.length} hops)</p>
              <div className="space-y-0.5">
                {redirects.slice(0, 5).map((hop, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`shrink-0 rounded px-1 font-mono text-[10px] ${hop.status >= 400 ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>{hop.status || "—"}</span>
                    <span className="truncate max-w-xs">{hop.url}</span>
                    {i < redirects.length - 1 && <ArrowRight className="h-3 w-3 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phishing warning */}
          {cf.safetyVerdict?.phishing && cf.safetyVerdict.phishing.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <ShieldX className="h-3.5 w-3.5 shrink-0" />
              Phishing kit detected: {cf.safetyVerdict.phishing.join(", ")}
            </div>
          )}

          {/* Scanned at */}
          {cf.safetyScannedAt && (
            <p className="text-[10px] text-muted-foreground/60">
              Scanned {new Date(cf.safetyScannedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({ result, mode, retryingIds, onRetry }: {
  result: CheckResult; mode: "all" | "selected";
  retryingIds: Set<string>; onRetry: (id: string, mode: "all" | "selected") => void;
}) {
  const cf = result.cloudflare;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="px-4 py-3 border-b border-border last:border-b-0"
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          {result.status === "ok" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : result.status === "broken" ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Top row: slug + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{result.slug}</span>
            <StatusBadge status={result.status} />
            {cf && <SafetyBadge status={cf.safetyStatus} trustScore={cf.safetyTrustScore} />}
            {result.statusCode ? (
              <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
            ) : result.status === "broken" ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />Connection failed
              </span>
            ) : null}
            {result.status === "broken" && (
              <RetryButton linkId={result.linkId} mode={mode} retryingIds={retryingIds} onRetry={onRetry} />
            )}
          </div>

          {/* Destination */}
          <a href={result.destination} target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span className="truncate max-w-md">{result.destination}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>

          {/* Content drift summary */}
          {result.status === "changed" && result.summary && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{result.summary}</p>
          )}

          {/* Trust bar */}
          {cf && cf.safetyTrustScore !== null && cf.safetyStatus !== "unknown" && cf.safetyStatus !== "pending" && (
            <TrustBar score={cf.safetyTrustScore} band={cf.safetyTrustBand} />
          )}

          {/* Cloudflare expandable panel */}
          {cf && <CloudflarePanel cf={cf} />}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stats cards ──────────────────────────────────────────────────────────────

function StatsCards({ stats, cfStats }: {
  stats: { total: number; ok: number; broken: number; changed: number };
  cfStats: { safe: number; malicious: number; suspicious: number };
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
        <p className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">OK</p>
        <p className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.ok}</p>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/20">
        <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Broken</p>
        <p className="mt-1.5 text-2xl font-bold text-red-700 dark:text-red-300">{stats.broken}</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Changed</p>
        <p className="mt-1.5 text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.changed}</p>
      </div>
      {/* Cloudflare safety stats */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20 col-span-1">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck className="h-3 w-3" />CF Safe</p>
        <p className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cfStats.safe}</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/20 col-span-1">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1"><ShieldAlert className="h-3 w-3" />Suspicious</p>
        <p className="mt-1.5 text-2xl font-bold text-amber-700 dark:text-amber-300">{cfStats.suspicious}</p>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/20 col-span-1">
        <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1"><ShieldX className="h-3 w-3" />Malicious</p>
        <p className="mt-1.5 text-2xl font-bold text-red-700 dark:text-red-300">{cfStats.malicious}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return workspaceLinks;
    const q = searchQuery.toLowerCase();
    return workspaceLinks.filter(
      (l) => l.destination.toLowerCase().includes(q) || l.slug.toLowerCase().includes(q) || (l.title && l.title.toLowerCase().includes(q))
    );
  }, [workspaceLinks, searchQuery]);

  const allFilteredSelected = useMemo(
    () => filteredLinks.length > 0 && filteredLinks.every((l) => selectedIds.has(l.id)),
    [filteredLinks, selectedIds]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (filteredLinks.every((l) => selectedIds.has(l.id))) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredLinks.map((l) => l.id)));
  }, [filteredLinks, selectedIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  function computeStats(results: CheckResult[]) {
    const total = results.length;
    const broken = results.filter((r) => r.status === "broken").length;
    const changed = results.filter((r) => r.status === "changed").length;
    const ok = total - broken - changed;
    const safe = results.filter((r) => r.cloudflare?.safetyStatus === "safe").length;
    const malicious = results.filter((r) => r.cloudflare?.safetyStatus === "malicious").length;
    const suspicious = results.filter((r) => r.cloudflare?.safetyStatus === "suspicious").length;
    return { total, ok, broken, changed, safe, malicious, suspicious };
  }

  const allStats = useMemo(() => computeStats(allResults), [allResults]);
  const selectedStats = useMemo(() => computeStats(selectedResults), [selectedResults]);

  const resultMap = useMemo(() => {
    const map = new Map<string, CheckResult>();
    for (const r of allResults) map.set(r.linkId, r);
    for (const r of selectedResults) map.set(r.linkId, r);
    return map;
  }, [allResults, selectedResults]);

  async function runScan(mode: "all" | "selected", ids?: string[]) {
    if (!workspaceId || scanning) return;
    setScanMode(mode);
    setScanning(true);
    if (mode === "all") setAllResults([]);
    else setSelectedResults([]);
    try {
      const res = await fetch("/api/ai/check-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...(ids ? { linkIds: ids } : {}) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Check failed (${res.status})`);
      }
      const data: CheckResponse = await res.json();
      if (mode === "all") setAllResults(data.results);
      else setSelectedResults(data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check links");
    } finally {
      setScanning(false);
    }
  }

  const handleScanAll = () => runScan("all");
  const handleScanSelected = () => runScan("selected", Array.from(selectedIds));

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
        const setter = mode === "all" ? setAllResults : setSelectedResults;
        setter((prev) => prev.map((r) => (r.linkId === linkId ? result : r)));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry link");
    } finally {
      setRetryingIds((prev) => { const n = new Set(prev); n.delete(linkId); return n; });
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
      const update = new Map(data.results.map((r) => [r.linkId, r]));
      const setter = mode === "all" ? setAllResults : setSelectedResults;
      setter((prev) => prev.map((r) => update.get(r.linkId) ?? r));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry broken links");
    } finally {
      setScanning(false);
    }
  };

  const activeResults = scanMode === "all" ? allResults : selectedResults;
  const activeStats = scanMode === "all" ? allStats : selectedStats;

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <SearchCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Link Checker</h1>
          <p className="text-sm text-muted-foreground">
            Scan for broken URLs, content drift, and Cloudflare safety verdicts.
          </p>
        </div>
      </div>

      {/* Scanning state */}
      {scanning && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background px-6 py-16 shadow-sm">
          <div className="relative mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-primary/5" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {scanMode === "selected" ? "Scanning selected links" : "Scanning all links"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Checking HTTP status, content changes, and Cloudflare safety data…
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="h-2 w-2 rounded-full bg-primary/40" />
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {!scanning && scanMode !== null && activeResults.length > 0 && (
        <motion.div key={scanMode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <SearchCheck className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {scanMode === "selected" ? "Selected Links Results" : "All Links Results"}
            </h2>
          </div>

          <StatsCards
            stats={{ total: activeStats.total, ok: activeStats.ok, broken: activeStats.broken, changed: activeStats.changed }}
            cfStats={{ safe: activeStats.safe, malicious: activeStats.malicious, suspicious: activeStats.suspicious }}
          />

          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div className="divide-y divide-border">
              {activeResults.map((result) => (
                <ResultRow key={result.linkId} result={result} mode={scanMode}
                  retryingIds={retryingIds} onRetry={handleRetrySingle} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeStats.broken > 0 && (
              <button type="button" onClick={() => handleRetryAllBroken(scanMode)} disabled={scanning}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                <RefreshCw className="h-4 w-4" />Retry Broken ({activeStats.broken})
              </button>
            )}
            <button type="button" onClick={handleScanAll}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
              <SearchCheck className="h-4 w-4" />Scan All Links
            </button>
            {selectedIds.size > 0 && (
              <button type="button" onClick={handleScanSelected}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:shadow-xl hover:shadow-amber-600/30">
                <Sparkles className="h-4 w-4" />Check Selected ({selectedIds.size})
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Pre-scan link list */}
      {!scanning && scanMode === null && workspaceLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter links…"
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60" />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleScanAll} disabled={!workspaceId || scanning}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none">
                <SearchCheck className="h-4 w-4" />Scan All Links
              </button>
              {selectedIds.size > 0 && (
                <button type="button" onClick={handleScanSelected} disabled={!workspaceId || scanning}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:shadow-xl hover:shadow-amber-600/30 disabled:opacity-50 disabled:shadow-none">
                  <Sparkles className="h-4 w-4" />Check Selected ({selectedIds.size})
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
                <button type="button" onClick={clearSelection}
                  className="text-xs text-muted-foreground hover:text-foreground underline">
                  Clear selection
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-3 font-medium">
                    <button type="button" onClick={toggleSelectAll}
                      aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                      {allFilteredSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="px-2 py-3 font-medium">Slug</th>
                  <th className="px-2 py-3 font-medium hidden sm:table-cell">Destination</th>
                  <th className="px-2 py-3 font-medium hidden lg:table-cell w-28">HTTP</th>
                  <th className="px-2 py-3 font-medium hidden lg:table-cell w-32">Safety</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link) => {
                  const isSelected = selectedIds.has(link.id);
                  const checked = resultMap.get(link.id);
                  return (
                    <tr key={link.id}
                      className={`border-b border-border transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                      <td className="w-10 px-4 py-3">
                        <button type="button" onClick={() => toggleSelect(link.id)}
                          aria-label={isSelected ? "Deselect" : "Select"}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-sm font-medium text-foreground">{link.slug}</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-2 py-3">
                        <a href={link.destination} target="_blank" rel="noopener noreferrer"
                          className="group flex items-center gap-1 truncate max-w-md text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <span className="truncate">{link.destination}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>
                      <td className="hidden lg:table-cell px-2 py-3 w-28">
                        {checked ? <StatusBadge status={checked.status} /> : <span className="text-xs text-muted-foreground">Not checked</span>}
                      </td>
                      <td className="hidden lg:table-cell px-2 py-3 w-32">
                        {checked?.cloudflare ? (
                          <SafetyBadge status={checked.cloudflare.safetyStatus} trustScore={checked.cloudflare.safetyTrustScore} />
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading */}
      {linksLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!scanning && !linksLoading && workspaceLinks.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-20">
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

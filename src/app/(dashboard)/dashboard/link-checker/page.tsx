"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { toast } from "sonner";

interface CheckResult {
  linkId: string;
  slug: string;
  destination: string;
  status: "ok" | "broken" | "changed";
  statusCode?: number;
  summary?: string;
}

interface CheckResponse {
  checked: number;
  broken: number;
  changed: number;
  results: CheckResult[];
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
  const [results, setResults] = useState<CheckResult[]>([]);
  const [scanDone, setScanDone] = useState(false);

  const stats = useMemo(() => {
    const total = results.length;
    const broken = results.filter((r) => r.status === "broken").length;
    const changed = results.filter((r) => r.status === "changed").length;
    const ok = total - broken - changed;
    return { total, ok, broken, changed };
  }, [results]);

  const handleScan = async () => {
    if (!workspaceId || scanning) return;
    setScanning(true);
    setResults([]);
    setScanDone(false);

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
      setResults(data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check links");
    } finally {
      setScanning(false);
      setScanDone(true);
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

      {/* Summary Cards or Scanning State */}
      {scanning ? (
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
          <h3 className="text-lg font-semibold text-foreground">Scanning your links</h3>
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
      ) : results.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
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
        </motion.div>
      ) : null}

      {/* Scan Button */}
      <div className="flex items-center justify-center sm:justify-start">
        <button
          type="button"
          onClick={handleScan}
          disabled={!workspaceId || scanning}
          className="group relative inline-flex h-11 items-center gap-2.5 overflow-hidden rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : results.length > 0 ? (
            <>
              <Sparkles className="h-4 w-4" />
              Scan Again
            </>
          ) : (
            <>
              <SearchCheck className="h-4 w-4" />
              Scan All Links
            </>
          )}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Results</h2>
              <span className="text-xs text-muted-foreground">
                ({results.length} link{results.length !== 1 ? "s" : ""} checked)
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
              {/* Table Header — desktop only */}
              <div className="hidden border-b border-border bg-muted/50 px-4 py-2.5 sm:grid sm:grid-cols-[40px_1fr_1.5fr_100px_120px] lg:grid-cols-[40px_1fr_1.5fr_100px_160px]">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Link</span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Destination</span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detail</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {results.map((result, index) => (
                    <motion.div
                      key={result.linkId}
                      initial={{ opacity: 0, x: -12, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      transition={{ duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
                    >
                      {/* Mobile layout */}
                      <div className="flex flex-col gap-1.5 px-4 py-3 sm:hidden">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={result.status} />
                          <span className="truncate text-sm font-medium text-foreground">
                            {result.slug}
                          </span>
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
                            <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                          ) : result.status === "broken" ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <AlertCircle className="h-3 w-3" />
                              Connection failed
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

                      {/* Desktop layout */}
                      <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1.5fr_100px_120px] lg:grid-cols-[40px_1fr_1.5fr_100px_160px] items-center gap-3 px-4 py-2.5">
                        <StatusIcon status={result.status} />
                        <span className="truncate text-sm font-medium text-foreground">
                          {result.slug}
                        </span>
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
                          <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                        ) : result.status === "broken" ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Connection failed
                          </span>
                        ) : result.status === "changed" ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {result.summary || "Content changed"}
                          </span>
                        ) : result.statusCode ? (
                          <span className="text-xs text-muted-foreground">HTTP {result.statusCode}</span>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!scanning && results.length === 0 && !scanDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-20"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 mb-4">
            <Link2 className="h-7 w-7 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No scan results yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Run a scan to check all your links for broken URLs, redirect chains, and content drift detected by AI.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            HEAD requests with 8s timeout
            <ArrowRight className="h-3 w-3" />
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            AI content-drift detection
          </div>
        </motion.div>
      )}

      {/* Scan done with no results */}
      {!scanning && results.length === 0 && scanDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Ban className="h-7 w-7 text-muted-foreground/60" />
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

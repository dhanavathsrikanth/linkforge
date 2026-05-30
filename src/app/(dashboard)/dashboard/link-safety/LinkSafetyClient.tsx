"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type SafetyStatus =
  | "unknown"
  | "pending"
  | "safe"
  | "suspicious"
  | "malicious"
  | "error";

interface SafetyVerdict {
  malicious?: boolean;
  categories?: string[];
  phishing?: string[];
  domain?: string;
  country?: string;
  asn?: string;
  asnName?: string;
  technologies?: { name: string; categories?: string[] }[];
}

interface SafetyLink {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  safetyStatus: SafetyStatus;
  safetyScanId: string | null;
  safetyScannedAt: string | null;
  safetyVerdict: SafetyVerdict | null;
  safetyBlockedByAdmin: boolean;
  safetyTrustScore: number | null;
  safetyTrustBand: TrustBand;
  createdAt: string;
}

type TrustBand = "unknown" | "low" | "medium" | "high" | "verified";

interface ScanDetailsResponse {
  linkId: string;
  capabilities: {
    techStack: boolean;
    screenshot: boolean;
    redirectChain: boolean;
    assetRiskFlags: boolean;
  };
  report: {
    id: string;
    scanId: string;
    fetchedAt: string | null;
    malicious: boolean | null;
    phishingKit: string | null;
    page: {
      url: string | null;
      ip: string | null;
      asn: string | null;
      asnName: string | null;
      country: string | null;
      server: string | null;
    };
    radarRank: number | null;
    trustScore: number | null;
    trustBand: TrustBand | null;
    categories: string[] | null;
    redirectChain:
      | { url: string; status: number; ip?: string; country?: string }[]
      | null;
    technologies:
      | { name: string; categories?: string[]; version?: string }[]
      | null;
    contactedDomains: string[] | null;
    performance: { ttfbMs?: number; fcpMs?: number; loadMs?: number } | null;
    cookies: { total: number; thirdParty: number; domains?: string[] } | null;
    console: { errors: number; warnings: number } | null;
    screenshotHash?: string | null;
    screenshotUrl?: string | null;
  } | null;
  flags: {
    id: string;
    kind: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }[];
}

interface LinksResponse {
  workspaceId: string;
  counts: Partial<Record<SafetyStatus, number>>;
  links: SafetyLink[];
}

type FilterKey = "all" | "flagged" | "pending" | "safe" | "error" | "unknown";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "flagged", label: "Flagged" },
  { key: "pending", label: "Pending" },
  { key: "safe", label: "Safe" },
  { key: "error", label: "Errors" },
  { key: "unknown", label: "Not scanned" },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  blocked,
}: {
  status: SafetyStatus;
  blocked?: boolean;
}) {
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <ShieldAlert className="h-3 w-3" />
        Blocked
      </span>
    );
  }
  if (status === "malicious") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <ShieldAlert className="h-3 w-3" />
        Malicious
      </span>
    );
  }
  if (status === "suspicious") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        Suspicious
      </span>
    );
  }
  if (status === "safe") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <ShieldCheck className="h-3 w-3" />
        Safe
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Scanning
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
        <AlertTriangle className="h-3 w-3" />
        Scan failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
      <ShieldQuestion className="h-3 w-3" />
      Not scanned
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LinkSafetyClient() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [rescanIds, setRescanIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ["link-safety", workspaceId, filter] as const,
    [workspaceId, filter]
  );

  const { data, isLoading, refetch } = useQuery<LinksResponse>({
    queryKey,
    queryFn: async () => {
      const url = new URL(
        "/api/url-scanner/links",
        window.location.origin
      );
      if (workspaceId) url.searchParams.set("workspaceId", workspaceId);
      if (filter !== "all") url.searchParams.set("status", filter);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: false,
  });

  // ── Background poller: refresh `pending` links every 15s ─────────────────
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pendingLinks = (data?.links ?? []).filter(
      (l) => l.safetyStatus === "pending" && l.safetyScanId
    );

    if (pendingLinks.length === 0) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    if (pollTimerRef.current) return;

    pollTimerRef.current = setInterval(async () => {
      const stillPending = (data?.links ?? []).filter(
        (l) => l.safetyStatus === "pending" && l.safetyScanId
      );
      if (stillPending.length === 0) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }
      let advanced = false;
      for (const link of stillPending) {
        try {
          const res = await fetch(
            `/api/url-scanner/refresh/${link.id}`,
            { method: "POST" }
          );
          if (res.status === 200) advanced = true;
        } catch {
          /* keep polling */
        }
      }
      if (advanced) refetch();
    }, 15_000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [data, refetch]);

  // ── Manual rescan ────────────────────────────────────────────────────────
  async function handleRescan(linkId: string) {
    setRescanIds((s) => new Set(s).add(linkId));
    try {
      const res = await fetch(`/api/url-scanner/rescan/${linkId}`, {
        method: "POST",
      });
      if (res.status === 503) {
        toast.error(
          "URL Scanner not configured. Add CLOUDFLARE_URL_SCANNER_TOKEN to your env."
        );
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Failed to rescan");
        return;
      }
      await refetch();
      toast.success("Rescan submitted. Verdict in 10-60s.");
    } catch {
      toast.error("Network error");
    } finally {
      setRescanIds((s) => {
        const next = new Set(s);
        next.delete(linkId);
        return next;
      });
    }
  }

  // ── Filtering by search ─────────────────────────────────────────────────
  const filteredLinks = useMemo(() => {
    const all = data?.links ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (l) =>
        l.slug.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q) ||
        (l.title && l.title.toLowerCase().includes(q))
    );
  }, [data?.links, search]);

  const counts = data?.counts ?? {};
  const total =
    (counts.safe ?? 0) +
    (counts.pending ?? 0) +
    (counts.malicious ?? 0) +
    (counts.suspicious ?? 0) +
    (counts.error ?? 0) +
    (counts.unknown ?? 0);
  const flagged = (counts.malicious ?? 0) + (counts.suspicious ?? 0);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Link Safety
            </h1>
            <p className="text-sm text-muted-foreground">
              Cloudflare URL Scanner verdicts for every link in this workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={total} tone="neutral" />
        <StatCard
          label="Safe"
          value={counts.safe ?? 0}
          tone="success"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Flagged"
          value={flagged}
          tone="danger"
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Pending"
          value={counts.pending ?? 0}
          tone="muted"
          icon={<Loader2 className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Errors"
          value={counts.error ?? 0}
          tone="warning"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Not scanned"
          value={counts.unknown ?? 0}
          tone="muted"
          icon={<ShieldQuestion className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer " +
                (filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slug or destination"
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Loading link safety…</p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="rounded-2xl border border-border bg-background overflow-hidden">
          {/* Header row (desktop only) */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_140px_120px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Link</span>
            <span>Status</span>
            <span>Scanned</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-border">
            {filteredLinks.map((link) => {
              const isExpanded = expandedId === link.id;
              const isRescanning = rescanIds.has(link.id);
              return (
                <motion.div
                  key={link.id}
                  initial={false}
                  animate={{ backgroundColor: "transparent" }}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_140px_120px] gap-2 sm:gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : link.id)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {link.title || link.slug}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">
                        {link.destination}
                      </p>
                      <div className="mt-1 sm:hidden flex items-center gap-1.5">
                        <StatusBadge
                          status={link.safetyStatus}
                          blocked={link.safetyBlockedByAdmin}
                        />
                        <TrustBadge
                          score={link.safetyTrustScore}
                          band={link.safetyTrustBand}
                        />
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5">
                      <StatusBadge
                        status={link.safetyStatus}
                        blocked={link.safetyBlockedByAdmin}
                      />
                      <TrustBadge
                        score={link.safetyTrustScore}
                        band={link.safetyTrustBand}
                      />
                    </div>

                    <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                      {link.safetyScannedAt
                        ? new Date(link.safetyScannedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" }
                          )
                        : "—"}
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/s/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                        title="Open short link"
                        aria-label="Open short link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRescan(link.id);
                        }}
                        disabled={isRescanning}
                        className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 disabled:opacity-50"
                        title="Re-scan with Cloudflare URL Scanner"
                      >
                        {isRescanning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Rescan</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 -mt-1">
                      <ScanDetails link={link} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger" | "warning" | "muted";
  icon?: React.ReactNode;
}) {
  const toneStyles: Record<string, string> = {
    neutral: "border-border bg-background text-foreground",
    success:
      "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300",
    danger:
      "border-red-200 bg-red-50/50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300",
    warning:
      "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300",
    muted:
      "border-border bg-muted/30 text-muted-foreground",
  };
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 shadow-sm ${toneStyles[tone]}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Trust badge ──────────────────────────────────────────────────────────────

function TrustBadge({
  score,
  band,
}: {
  score: number | null;
  band: TrustBand;
}) {
  if (band === "unknown" || score === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
        <ShieldQuestion className="h-3 w-3" />
        Unscored
      </span>
    );
  }
  const styles: Record<Exclude<TrustBand, "unknown">, string> = {
    low: "border-red-200 bg-red-50 text-red-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    high: "border-emerald-200 bg-emerald-50 text-emerald-700",
    verified: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[band]}`}
      title={`Trust score: ${score}/100 — ${band}`}
    >
      <ShieldCheck className="h-3 w-3" />
      {score}/100
    </span>
  );
}

// ─── Scan details ─────────────────────────────────────────────────────────────

function ScanDetails({ link }: { link: SafetyLink }) {
  const { data, isLoading } = useQuery<ScanDetailsResponse>({
    queryKey: ["link-safety-details", link.id],
    queryFn: async () => {
      const res = await fetch(`/api/url-scanner/links/${link.id}/details`);
      if (!res.ok) throw new Error("Failed to load details");
      return res.json();
    },
    staleTime: 30_000,
  });

  if (link.safetyStatus === "pending") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
        Scan in progress. This usually takes 10-60 seconds. The page will
        refresh the verdict automatically.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading scan details…
      </div>
    );
  }

  if (!data?.report) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
        No finished scan yet. Try rescanning.
      </div>
    );
  }

  const { report, flags, capabilities } = data;

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4 space-y-4">
      {/* ── Top row: Trust + page meta ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge score={report.trustScore} band={(report.trustBand ?? "unknown") as TrustBand} />
        {report.malicious && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
            <ShieldAlert className="h-3 w-3" />
            Malicious verdict
          </span>
        )}
        {report.phishingKit && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
            Phishing kit: {report.phishingKit}
          </span>
        )}
        {report.radarRank && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Radar Rank #{report.radarRank.toLocaleString()}
          </span>
        )}
      </div>

      {/* ── Screenshot ───────────────────────────────────────────────── */}
      {capabilities.screenshot && report.screenshotUrl && (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.screenshotUrl}
            alt={`Screenshot of ${link.destination}`}
            className="w-full max-h-96 object-cover object-top"
            loading="lazy"
          />
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">
            Visual proof captured by Cloudflare URL Scanner
          </div>
        </div>
      )}
      {!capabilities.screenshot && report.screenshotHash && (
        <UpgradePrompt feature="Screenshot proof" />
      )}

      {/* ── Page details grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {report.page.url && (
          <DetailField label="Final URL" value={report.page.url} mono full />
        )}
        {report.page.country && (
          <DetailField label="Country" value={report.page.country} />
        )}
        {report.page.asn && (
          <DetailField
            label="ASN"
            value={`${report.page.asn}${report.page.asnName ? ` · ${report.page.asnName}` : ""}`}
          />
        )}
        {report.page.ip && (
          <DetailField label="IP" value={report.page.ip} mono />
        )}
        {report.page.server && (
          <DetailField label="Server" value={report.page.server} />
        )}
      </div>

      {/* ── Categories ─────────────────────────────────────────────────── */}
      {(report.categories?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {report.categories!.map((c) => (
              <span
                key={c}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Asset risk flags ──────────────────────────────────────────── */}
      {flags.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Suspicious assets ({flags.length})
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-900 dark:text-amber-200">
            {flags.map((f) => (
              <li key={f.id} className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">{flagLabel(f.kind)}</span>
                  {flagSummary(f) && <span className="ml-1.5">— {flagSummary(f)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : capabilities.assetRiskFlags ? (
        <p className="text-[11px] text-muted-foreground">No suspicious assets detected.</p>
      ) : null}

      {/* ── DOM analysis ──────────────────────────────────────────────── */}
      {capabilities.assetRiskFlags && (report as any).domAnalysis && (() => {
        const dom = (report as any).domAnalysis as {
          hiddenIframes: number;
          passwordInputs: number;
          obfuscatedScripts: number;
          metaRedirects: number;
          externalFormActions: string[];
          cryptoAddressPatterns: number;
          suspicious: boolean;
        };
        if (!dom.suspicious && dom.passwordInputs === 0) return null;
        return (
          <div className={`rounded-lg border px-3 py-2.5 ${dom.suspicious ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : "border-border bg-muted/10"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${dom.suspicious ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>
              DOM analysis {dom.suspicious ? "— suspicious" : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {dom.hiddenIframes > 0 && <span className="text-red-700">Hidden iframes: {dom.hiddenIframes}</span>}
              {dom.obfuscatedScripts > 0 && <span className="text-amber-700">Obfuscated scripts: {dom.obfuscatedScripts}</span>}
              {dom.metaRedirects > 0 && <span className="text-amber-700">Meta redirects: {dom.metaRedirects}</span>}
              {dom.passwordInputs > 0 && <span className="text-muted-foreground">Password inputs: {dom.passwordInputs}</span>}
              {dom.cryptoAddressPatterns > 0 && <span className="text-red-700">Crypto addresses: {dom.cryptoAddressPatterns}</span>}
            </div>
            {dom.externalFormActions.length > 0 && (
              <div className="mt-1.5">
                <p className="text-[10px] font-semibold text-red-700">External form actions</p>
                <ul className="mt-0.5 space-y-0.5">
                  {dom.externalFormActions.map((a, i) => (
                    <li key={i} className="font-mono text-[11px] text-red-800 truncate">{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Redirect chain ────────────────────────────────────────────── */}
      {capabilities.redirectChain && (report.redirectChain?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Redirect chain ({report.redirectChain!.length} hops)
          </p>
          <ol className="mt-1 space-y-1 text-xs">
            {report.redirectChain!.map((hop, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1"
              >
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  #{i + 1}
                </span>
                <span className="font-mono truncate flex-1">{hop.url}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    hop.status >= 400
                      ? "bg-red-100 text-red-700"
                      : hop.status >= 300
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {hop.status || "—"}
                </span>
                {hop.country && (
                  <span className="text-[10px] text-muted-foreground">{hop.country}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Technologies ──────────────────────────────────────────────── */}
      {capabilities.techStack && (report.technologies?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Detected technologies
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {report.technologies!.slice(0, 12).map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-background"
                title={t.categories?.join(", ")}
              >
                {t.name}
                {t.version ? ` ${t.version}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {!capabilities.techStack && (
        <UpgradePrompt feature="Technology stack" />
      )}

      {/* ── Performance ──────────────────────────────────────────────── */}
      {report.performance && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <PerfStat label="TTFB" valueMs={report.performance.ttfbMs} />
          <PerfStat label="FCP" valueMs={report.performance.fcpMs} />
          <PerfStat label="Load" valueMs={report.performance.loadMs} />
        </div>
      )}

      {/* ── HAR summary ──────────────────────────────────────────────── */}
      {capabilities.assetRiskFlags && (report as ScanDetailsResponse["report"] & { harSummary?: { thirdPartyDomains: string[]; resourceTypes: Record<string, number>; totalRequests: number; totalTransferBytes: number; pageLoadMs: number | null } | null })?.harSummary && (() => {
        const har = (report as any).harSummary as { thirdPartyDomains: string[]; resourceTypes: Record<string, number>; totalRequests: number; totalTransferBytes: number; pageLoadMs: number | null };
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Network log
              </p>
              <a
                href={`/api/url-scanner/har/${report.scanId}`}
                download={`${report.scanId}.har.json`}
                className="text-[10px] text-primary hover:underline cursor-pointer"
              >
                Download full HAR
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requests</p>
                <p className="mt-0.5 font-semibold tabular-nums">{har.totalRequests}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transfer</p>
                <p className="mt-0.5 font-semibold tabular-nums">{har.totalTransferBytes > 0 ? `${(har.totalTransferBytes / 1024).toFixed(0)} KB` : "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">3rd-party</p>
                <p className="mt-0.5 font-semibold tabular-nums">{har.thirdPartyDomains.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Load</p>
                <p className="mt-0.5 font-semibold tabular-nums">{har.pageLoadMs != null ? `${har.pageLoadMs.toFixed(0)} ms` : "—"}</p>
              </div>
            </div>
            {har.thirdPartyDomains.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Third-party domains</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {har.thirdPartyDomains.slice(0, 15).map((d) => (
                    <span key={d} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border border-border bg-background text-muted-foreground">
                      {d}
                    </span>
                  ))}
                  {har.thirdPartyDomains.length > 15 && (
                    <span className="text-[11px] text-muted-foreground">+{har.thirdPartyDomains.length - 15} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function PerfStat({ label, valueMs }: { label: string; valueMs: number | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {typeof valueMs === "number" ? `${valueMs.toLocaleString()} ms` : "—"}
      </p>
    </div>
  );
}

function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
      <span className="font-semibold">{feature}</span> — available on Growth plan and above.
    </div>
  );
}

function flagLabel(kind: string): string {
  switch (kind) {
    case "crypto_miner":
      return "Crypto miner";
    case "fingerprinter":
      return "Browser fingerprinter";
    case "excessive_third_party_cookies":
      return "Excessive third-party cookies";
    case "suspicious_global":
      return "Suspicious JS global";
    case "console_error_burst":
      return "Console error burst";
    case "expired_certificate":
      return "Expired TLS certificate";
    case "long_redirect_chain":
      return "Long redirect chain";
    case "similar_to_malicious":
      return "Similar to known malicious sites";
    default:
      return kind;
  }
}

function flagSummary(flag: { kind: string; payload: Record<string, unknown> }): string | null {
  const p = flag.payload ?? {};
  if (flag.kind === "crypto_miner" || flag.kind === "fingerprinter") {
    const domains = (p.domains as string[] | undefined) ?? [];
    return domains.slice(0, 3).join(", ") + (domains.length > 3 ? ` +${domains.length - 3} more` : "");
  }
  if (flag.kind === "excessive_third_party_cookies") return `${p.count ?? "?"} cookies`;
  if (flag.kind === "console_error_burst") return `${p.errors ?? "?"} errors`;
  if (flag.kind === "long_redirect_chain") return `${p.hops ?? "?"} hops`;
  if (flag.kind === "expired_certificate") return `${p.count ?? 1} expired`;
  if (flag.kind === "suspicious_global") {
    const names = (p.names as string[] | undefined) ?? [];
    return names.slice(0, 3).join(", ");
  }
  return null;
}

function DetailField({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 sm:col-span-4" : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-foreground truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterKey }) {
  const messages: Record<FilterKey, { title: string; sub: string }> = {
    all: {
      title: "No links yet",
      sub: "Once you create short links they'll appear here with their safety verdicts.",
    },
    flagged: {
      title: "No flagged links",
      sub: "Cloudflare hasn't flagged any of your destinations as malicious.",
    },
    pending: {
      title: "No scans in progress",
      sub: "All link destinations have been verified.",
    },
    safe: {
      title: "No safe links yet",
      sub: "New links are scanned in the background — wait a moment and refresh.",
    },
    error: {
      title: "No scan errors",
      sub: "All recent scans completed successfully.",
    },
    unknown: {
      title: "All links scanned",
      sub: "Every link has been submitted to Cloudflare URL Scanner.",
    },
  };
  const m = messages[filter];
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">{m.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">{m.sub}</p>
    </div>
  );
}

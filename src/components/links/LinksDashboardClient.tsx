"use client";

import { Fragment, useState, useTransition, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, CircleCheck, ExternalLink, Plus, QrCode, ChevronDown, BarChart2, Trash2, Loader2, FileText, Download, Sparkles, Send, Edit3, FlaskConical, Folder, Tag, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { useClipboard } from "@/hooks/use-clipboard";
import { AdvancedCreateSheet, type FolderOption } from "./AdvancedCreateSheet";
import { BulkCreateSheet } from "./BulkCreateSheet";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { QRCustomizePanel } from "@/components/qr/QRCustomizePanel";
import { RealtimeClicks } from "@/components/analytics/RealtimeClicks";
import { KPICard } from "@/components/analytics/KPICard";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { TopCountries } from "@/components/analytics/TopCountries";
import { DonutChart } from "@/components/analytics/DonutChart";
import { TopReferrers } from "@/components/analytics/TopReferrers";
import { FolderFilter, FolderItem } from "@/components/dashboard/FolderFilter";
import { TagFilter, TagItem } from "@/components/dashboard/TagFilter";
import { ActiveUsersIndicator, RealtimeStatusIndicator } from "@/components/dashboard/ActiveUsersIndicator";
import { useRealtime } from "@/providers/RealtimeProvider";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import { getShortLinkBase } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  tags: string[];
  folderId: string | null;
  totalClicks: number;
  uniqueClicks: number;
  createdAt: string | Date;
  isActive?: boolean;
  password?: string | null;
  expiresAt?: string | Date | null;
  clickLimit?: number | null;
  routingRules?: { condition: { device?: string; country?: string; language?: string }; destination: string }[];
  scheduledAt?: string | null;
  qrSettings?: QRSettings | null;
};

type Props = {
  workspaceId: string;
  initialLinks: LinkRow[];
  defaultDomain?: string;
  folders?: FolderItem[];
};

function ExpandedRow({ link, workspaceId }: { link: LinkRow; workspaceId: string }) {
  const { data: overview, isLoading: overviewLoading } = useQuery<any>({
    queryKey: ["analytics", "overview", workspaceId, "7d", link.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${workspaceId}&range=7d&linkId=${link.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "timeseries", workspaceId, link.id, "7d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/timeseries?workspaceId=${workspaceId}&range=7d&linkId=${link.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const { data: countries, isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "country"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=country`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "device"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=device`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const { data: referrers, isLoading: referrersLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "referrer"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=referrer`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-slate-50 px-5 py-4 space-y-4 dark:bg-slate-900/50">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KPICard label="Total Clicks" value={overview?.totalClicks || 0} growth={overview?.clicksGrowth} isLoading={overviewLoading} />
          <KPICard label="Unique Visitors" value={overview?.uniqueClicks || 0} isLoading={overviewLoading} />
          <KPICard label="Today" value={overview?.clicksToday || 0} isLoading={overviewLoading} />
          <KPICard label="Top Device" value={0} subValue={overview?.topDevice && overview.topDevice !== "unknown" ? overview.topDevice : "—"} isLoading={overviewLoading} />
          <KPICard label="Top Country" value={0} subValue={overview?.topCountry && overview.topCountry !== "Unknown" ? overview.topCountry : "—"} isLoading={overviewLoading} />
        </div>

        {/* Clicks Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clicks Over Time</h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Last 7 days</span>
          </div>
          <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
        </div>

        {/* Three Column Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Top Countries</h3>
            <TopCountries data={countries || []} isLoading={countriesLoading} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Device Breakdown</h3>
            <DonutChart data={devices || []} isLoading={devicesLoading} />
            {devices && devices.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {devices.slice(0, 3).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981"][i] }} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Top Referrers</h3>
            <TopReferrers data={referrers || []} isLoading={referrersLoading} />
          </div>
        </div>

        {/* Live Activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Live Activity</h3>
          <RealtimeClicks slug={link.slug} />
        </div>

        {/* Schedule Info */}
        {(link as any).scheduledAt && new Date((link as any).scheduledAt) > new Date() && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm dark:border-blue-800 dark:bg-blue-950/20">
            <h3 className="mb-1 text-sm font-semibold text-blue-800 dark:text-blue-300">
              Scheduled
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Goes live on {new Date((link as any).scheduledAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* A/B Test Summary (active) */}
        {(link as any).abTestEnabled && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm dark:border-violet-800 dark:bg-violet-950/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                A/B Test Running
              </h3>
              <Link
                href={`/dashboard/links/${link.id}/ab-test`}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                View details →
              </Link>
            </div>
            <div className="text-xs text-violet-700 dark:text-violet-300 space-y-1">
              <p>{(link as any).abTestVariants?.length ?? 0} variants</p>
              {(link as any).abTestStartedAt && (
                <p>Started {new Date((link as any).abTestStartedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        )}

        {/* A/B Test Summary (completed) */}
        {(link as any).abTestWinner && !(link as any).abTestEnabled && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                A/B Test Complete
              </h3>
              <Link
                href={`/dashboard/links/${link.id}/ab-test`}
                className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                View results →
              </Link>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Winner: <strong>{(link as any).abTestWinner}</strong>
            </p>
            {(link as any).abTestEndedAt && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                Ended {new Date((link as any).abTestEndedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Routing Rules Summary */}
        {(link as any).routingRules?.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm dark:border-violet-800 dark:bg-violet-950/20">
            <h3 className="mb-2 text-sm font-semibold text-violet-800 dark:text-violet-300">
              Smart Routing Rules ({(link as any).routingRules.length})
            </h3>
            <div className="space-y-1.5">
              {(link as any).routingRules.map((rule: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-violet-700 dark:text-violet-300">
                  <span className="font-medium">Rule {i + 1}:</span>
                  {rule.condition.device && <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{rule.condition.device}</span>}
                  {rule.condition.country && <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{rule.condition.country}</span>}
                  {rule.condition.language && <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{rule.condition.language}</span>}
                  {!rule.condition.device && !rule.condition.country && !rule.condition.language && (
                    <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300">All</span>
                  )}
                  <span className="text-violet-500">&rarr;</span>
                  <span className="truncate max-w-[300px] font-mono text-violet-900 dark:text-violet-200">{rule.destination}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analytics Query */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Ask AI about this link</h3>
          <AiAnalyticsQuery workspaceId={workspaceId} linkId={link.id} />
        </div>
      </div>
    </motion.div>
  );
}

function exportCSV(links: LinkRow[]) {
  const headers = [
    "slug", "destination", "title", "tags", "totalClicks",
    "uniqueClicks", "isActive", "password", "expiresAt", "clickLimit",
    "utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent",
    "createdAt",
  ];
  const rows = links.map((l) =>
    headers
      .map((h) => {
        const val = (l as any)[h];
        if (val === null || val === undefined) return "";
        let str = Array.isArray(val) ? val.join("; ") : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `links-export-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AiAnalyticsQuery({ workspaceId, linkId }: { workspaceId: string; linkId?: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai/analytics-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, linkId, question }),
      });
      if (!res.ok) {
        setAnswer("AI is not configured for this workspace yet.");
        return;
      }
      const data = await res.json();
      setAnswer(data.answer);
    } catch {
      setAnswer("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder='e.g. "Which link got the most clicks last week?"'
          className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Ask
        </button>
      </div>
      {answer && (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}

export function LinksDashboardClient({
  workspaceId,
  initialLinks,
  defaultDomain = getShortLinkBase(),
  folders = [],
}: Props) {
  const { workspace } = useWorkspace();
  const { lastEvent, refreshData } = useRealtime();
  const queryClient = useQueryClient();
  const role = workspace?.role;
  const isViewer = role === "viewer";
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [advancedPrefill, setAdvancedPrefill] = useState<{ id?: string; destination?: string; slug?: string }>({});
  const [qrLinkId, setQrLinkId] = useState<string | null>(null);
  const { copied, copy } = useClipboard();
  const qrLink = links.find((l) => l.id === qrLinkId) ?? null;
  const [createdLink, setCreatedLink] = useState<{ slug: string; shortUrl: string; destination: string } | null>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [localFolders, setLocalFolders] = useState<FolderItem[]>(folders);

  const { data: realtimeLinksData, isLoading: realtimeLinksLoading } = useQuery<{ links: LinkRow[] }>({
    queryKey: ["links", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/links?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch links");
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });

  const { data: realtimeFoldersData } = useQuery<{ folders: FolderItem[] }>({
    queryKey: ["folders", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/folders?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });

  useEffect(() => {
    if (realtimeLinksData?.links && lastEvent) {
      if (lastEvent.type.startsWith("link_") && lastEvent.workspaceId === workspaceId) {
        setLinks(realtimeLinksData.links);
      }
    }
  }, [realtimeLinksData, lastEvent, workspaceId]);

  useEffect(() => {
    if (realtimeFoldersData?.folders) {
      setLocalFolders(realtimeFoldersData.folders);
    }
  }, [realtimeFoldersData]);

  const filteredLinks = useMemo(() => {
    let filtered = [...links];

    if (selectedFolderId !== null) {
      filtered = filtered.filter((link) => link.folderId === selectedFolderId);
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((link) =>
        selectedTags.every((tag) => link.tags.includes(tag))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (link) =>
          link.destination.toLowerCase().includes(q) ||
          link.slug.toLowerCase().includes(q) ||
          (link.title && link.title.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [links, selectedFolderId, selectedTags, searchQuery]);

  const allTags = useMemo(() => {
    const tagMap = new Map<string, TagItem>();
    links.forEach((link) => {
      link.tags?.forEach((tagName) => {
        if (!tagMap.has(tagName)) {
          tagMap.set(tagName, {
            id: tagName,
            name: tagName,
            color: "#6366f1",
          });
        }
      });
    });
    return Array.from(tagMap.values());
  }, [links]);

  function handleCreated(link: any) {
    const shortUrl = `https://${defaultDomain}/${link.slug}`;
    setCreatedLink({ slug: link.slug, shortUrl, destination: link.destination });
    setLinks((prev) => [link as LinkRow, ...prev.filter((l) => l.id !== link.id)]);
    handleFoldersChange();

    if (workspaceId) {
      try {
        fetch("/api/realtime/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "link_created",
            workspaceId,
            linkId: link.id,
          }),
        }).catch(console.error);
      } catch (e) {
        console.error("Failed to publish realtime event", e);
      }
    }
  }

  function handleFoldersChange() {
    fetch(`/api/folders?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.folders) {
          setLocalFolders(data.folders);
        }
      })
      .catch(console.error);
  }

  function handleFolderCreate(folder: FolderItem | FolderOption) {
    setLocalFolders((prev) => [folder as FolderItem, ...prev]);
  }

function openAdvanced(prefill: { id?: string; destination?: string; slug?: string }) {
  setAdvancedPrefill(prefill);
  setAdvancedOpen(true);
}

  function handleDelete(linkId: string) {
    startDelete(async () => {
      try {
        const res = await fetch(`/api/links/${linkId}?workspaceId=${workspaceId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("Delete failed", err);
          return;
        }
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
        
        if (workspaceId) {
          try {
            await fetch("/api/realtime/event", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "link_deleted",
                workspaceId,
                linkId,
              }),
            });
          } catch (e) {
            console.error("Failed to publish realtime event", e);
          }
        }
      } catch (e) {
        console.error("Delete error", e);
      } finally {
        setDeleteId(null);
      }
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Links</h1>
            <RealtimeStatusIndicator />
            <ActiveUsersIndicator />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your short links and track their performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
            {!isViewer && (
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Bulk Create
            </button>
          )}
          <button
            type="button"
            onClick={() => exportCSV(links)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/ai/check-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId }),
              });
              if (res.ok) {
                const data = await res.json();
                const msg = data.broken > 0 || data.changed > 0
                  ? `${data.broken} broken, ${data.changed} changed`
                  : "All links OK";
                alert(`Checked ${data.checked} links. ${msg}.`);
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted"
          >
            <Sparkles className="h-4 w-4" />
            Check Links
          </button>
          <button
            type="button"
            onClick={() => !isViewer && openAdvanced({})}
            disabled={isViewer}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Create Link
          </button>
        </div>
      </div>

      {isViewer ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          You have read-only access. Contact a workspace admin to create or edit links.
        </div>
      ) : (
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search links by URL, slug or title..."
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
            <FolderFilter
              folders={localFolders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              workspaceId={workspaceId}
              onFoldersChange={handleFoldersChange}
            />
            <TagFilter
              tags={allTags}
              selectedTags={selectedTags}
              onTagsSelect={setSelectedTags}
              links={links}
            />
            {(selectedFolderId !== null || selectedTags.length > 0 || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFolderId(null);
                  setSelectedTags([]);
                  setSearchQuery("");
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredLinks.length} {filteredLinks.length === 1 ? "link" : "links"}
            </div>
          </div>
        </div>
      )}

      {filteredLinks.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4 dark:bg-slate-700">
            <BarChart2 className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create your first link</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Paste a URL above to instantly shorten it, or click Create Link for advanced options.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-5 py-3 w-8"></th>
                <th className="px-5 py-3 font-semibold">Link</th>
                <th className="px-5 py-3 font-semibold hidden lg:table-cell">Folder</th>
                <th className="px-5 py-3 font-semibold hidden sm:table-cell">Short URL</th>
                <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                <th className="px-5 py-3 text-right font-semibold hidden md:table-cell">Unique</th>
                <th className="px-5 py-3 font-semibold hidden lg:table-cell">Created</th>
                <th className="px-5 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filteredLinks.map((link) => {
                  const shortUrl = `https://${defaultDomain}/${link.slug}`;
                  const isExpanded = expandedId === link.id;
                  const isCopied = copied === link.id;
                  return (
                    <Fragment key={link.id}>
                      <motion.tr
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className={`border-b border-slate-200 transition-colors dark:border-slate-700 ${isExpanded ? "bg-slate-100 dark:bg-slate-800/50" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}
                      >
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(link.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                            />
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-slate-900 max-w-[200px] lg:max-w-[280px] dark:text-slate-100">
                              {link.title || link.destination.replace(/^https?:\/\//, "")}
                            </p>
                            {link.password && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-600 border border-amber-200">
                                Locked
                              </span>
                            )}
                            {(link as any).scheduledAt && new Date((link as any).scheduledAt) > new Date() && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600 border border-blue-200">
                                Scheduled
                              </span>
                            )}
                            {(link as any).routingRules?.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-600 border border-violet-200">
                              Routed
                            </span>
                          )}
                          {(link as any).abTestEnabled && (
                            <Link
                              href={`/dashboard/links/${link.id}/ab-test`}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-600 border border-violet-200 hover:bg-violet-100 transition-colors"
                              title="A/B test active"
                            >
                              <BarChart2 className="h-3 w-3" />
                              A/B
                            </Link>
                          )}
                          {link.folderId && (() => {
                            const folder = localFolders.find((f) => f.id === link.folderId);
                            return folder ? (
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium"
                                style={{
                                  backgroundColor: folder.color + "15",
                                  color: folder.color
                                }}
                              >
                                <Folder className="h-3 w-3" />
                                {folder.name}
                              </span>
                            ) : null;
                          })()}
                          {link.tags && link.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {link.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {link.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{link.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                          <p className="mt-0.5 truncate text-xs text-slate-500 max-w-[300px] dark:text-slate-400">
                            {link.destination}
                          </p>
                        </div>
                        </td>
                        <td className="px-5 py-3 hidden lg:table-cell">
                          <InlineFolderSelector
                            linkId={link.id}
                            currentFolderId={link.folderId}
                            folders={localFolders}
                            onMove={(newFolderId) => {
                              setLinks((prev) =>
                                prev.map((l) =>
                                  l.id === link.id ? { ...l, folderId: newFolderId } : l
                                )
                              );
                              fetch(`/api/links/${link.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ folderId: newFolderId }),
                              }).catch(console.error);
                            }}
                          />
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copy(shortUrl, link.id)}
                              className="group inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                              title="Click to copy"
                            >
                              {defaultDomain}/{link.slug}
                              <span className="text-slate-400 group-hover:text-slate-600 transition-colors dark:text-slate-500 dark:group-hover:text-slate-300">
                                {isCopied ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </span>
                            </button>
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-600 transition-colors dark:text-slate-500 dark:hover:text-slate-300"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {link.totalClicks ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500 hidden md:table-cell dark:text-slate-400">
                          {link.uniqueClicks ?? 0}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 hidden lg:table-cell dark:text-slate-400">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => toggleExpand(link.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                              title="Analytics"
                            >
                              <BarChart2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { copy(shortUrl, link.id); }}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors sm:hidden dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                              title="Copy"
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrLinkId(link.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                              title="QR Code"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              href={`/dashboard/links/${link.id}/ab-test`}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors dark:text-slate-500 dark:hover:text-violet-400 dark:hover:bg-violet-950/30"
                              title="A/B Testing"
                            >
                              <FlaskConical className="h-3.5 w-3.5" />
                            </Link>
                            {!isViewer && (
                              <button
                                type="button"
                                onClick={() => openAdvanced({ id: link.id })}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                                title="Edit link"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {!isViewer && (
                              <button
                                type="button"
                                onClick={() => setDeleteId(link.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                                title="Delete link"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <td colSpan={7} className="p-0">
                            <ExpandedRow link={link} workspaceId={workspaceId} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {!isViewer && (
        <AdvancedCreateSheet
        workspaceId={workspaceId}
        defaultDomain={defaultDomain}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        prefill={advancedPrefill}
        onCreated={handleCreated}
        folders={localFolders}
        onFolderCreate={handleFolderCreate}
      />
      )}

      {!isViewer && (
        <BulkCreateSheet
          workspaceId={workspaceId}
          defaultDomain={defaultDomain}
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          onCreated={handleCreated}
        />
      )}

      {qrLink && (
        <QRCustomizePanel
          open={!!qrLinkId}
          onOpenChange={(v) => { if (!v) setQrLinkId(null); }}
          linkId={qrLink.id}
          linkSlug={qrLink.slug}
          shortUrl={`https://${defaultDomain}/${qrLink.slug}`}
          linkTitle={qrLink.title ?? qrLink.slug}
          initialSettings={qrLink.qrSettings ?? DEFAULT_QR_SETTINGS}
        />
      )}

      {createdLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Link created!</h3>
              <p className="mt-1 text-sm text-muted-foreground">Your short link is ready to share.</p>
            </div>
            <div className="mt-5 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={createdLink.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-mono text-sm font-medium text-primary hover:underline"
                >
                  {createdLink.shortUrl}
                </a>
                <button
                  type="button"
                  onClick={() => copy(createdLink.shortUrl, "created")}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {copied === "created" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreatedLink(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
              <a
                href={createdLink.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Visit
              </a>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {copied && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-lg"
          >
            <Check className="h-4 w-4 text-emerald-500" />
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Delete link?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This action cannot be undone. All analytics data for this link will also be removed.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineFolderSelector({
  linkId,
  currentFolderId,
  folders,
  onMove,
}: {
  linkId: string;
  currentFolderId: string | null;
  folders: FolderItem[];
  onMove: (folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
            "hover:bg-muted",
            currentFolder
              ? "font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentFolder ? (
            <>
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-[8px]"
                style={{ color: currentFolder.color }}
              >
                <Folder className="h-3 w-3" />
              </span>
              <span className="truncate max-w-[80px]">{currentFolder.name}</span>
            </>
          ) : (
            <>
              <Folder className="h-3 w-3 opacity-50" />
              <span>None</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none hover:bg-muted data-[highlighted]:bg-muted"
            onClick={() => {
              onMove(null);
              setOpen(false);
            }}
          >
            <Folder className="h-3 w-3 opacity-50" />
            <span className="flex-1">No folder</span>
            {currentFolderId === null && <CircleCheck className="h-3 w-3 text-primary" />}
          </DropdownMenu.Item>

          {folders.map((folder) => (
            <DropdownMenu.Item
              key={folder.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none hover:bg-muted data-[highlighted]:bg-muted"
              onClick={() => {
                onMove(folder.id);
                setOpen(false);
              }}
            >
              <span
                className="flex h-3 w-3 items-center justify-center rounded text-[8px]"
                style={{ color: folder.color }}
              >
                <Folder className="h-3 w-3" />
              </span>
              <span className="flex-1 truncate">{folder.name}</span>
              {currentFolderId === folder.id && <CircleCheck className="h-3 w-3 text-primary" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

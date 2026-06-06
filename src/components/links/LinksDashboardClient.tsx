"use client";

import { Fragment, useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, Plus, QrCode, ChevronDown, MoreHorizontal, BarChart2, Trash2, Loader2, FileText, Download, Sparkles, Send, Edit3, FlaskConical, Folder, Tag, Search, X, Users, Calendar, Square, CheckSquare, MinusSquare, Archive, RefreshCw, FolderOpen, Tag as TagIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useClipboard } from "@/hooks/use-clipboard";
import { AdvancedCreateSheet, type FolderOption } from "./AdvancedCreateSheet";
import { BulkCreateSheet } from "./BulkCreateSheet";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { SharedQRCode } from "@/components/qr/SharedQRCode";
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
    // Auto-refresh every 15s so the row's KPIs/charts stay current without a
    // manual reload. Tab visibility / focus handled by React Query defaults.
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "timeseries", workspaceId, link.id, "7d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/timeseries?workspaceId=${workspaceId}&range=7d&linkId=${link.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: countries, isLoading: countriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "country"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=country`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "device"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=device`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: referrers, isLoading: referrersLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "referrer"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=referrer`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  // Per-QR analytics — separate queries so QR scans show up as their own
  // section in the expanded row (count, growth, time series, top countries,
  // top devices, top referrers — all filtered to clicks where isQrScan=true).
  const { data: qrOverview, isLoading: qrOverviewLoading } = useQuery<any>({
    queryKey: ["analytics", "overview", workspaceId, "7d", link.id, "qr"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&source=qr`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: qrTimeSeries, isLoading: qrTimeSeriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "timeseries", workspaceId, link.id, "7d", "qr"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/timeseries?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&source=qr`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: qrCountries, isLoading: qrCountriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "country", "qr"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=country&source=qr`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: qrDevices, isLoading: qrDevicesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, link.id, "7d", "device", "qr"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${link.id}&dimension=device&source=qr`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="overflow-x-auto bg-slate-50 px-4 py-4 space-y-4 dark:bg-slate-900/50">
        {/* KPI Cards Row */}
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <KPICard compact label="Total Clicks" value={overview?.totalClicks || 0} growth={overview?.clicksGrowth} isLoading={overviewLoading} />
          <KPICard compact label="Unique" value={overview?.uniqueClicks || 0} isLoading={overviewLoading} />
          <KPICard compact label="Today" value={overview?.clicksToday || 0} isLoading={overviewLoading} />
          <KPICard compact label="Top Device" value={overview?.topDeviceCount ?? 0} subValue={overview?.topDevice && overview.topDevice !== "unknown" ? overview.topDevice : "—"} isLoading={overviewLoading} />
          <KPICard compact label="Top Country" value={overview?.topCountryCount ?? 0} subValue={overview?.topCountry && overview.topCountry !== "Unknown" ? overview.topCountry : "—"} isLoading={overviewLoading} />
        </div>

        {/* Clicks Chart */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clicks Over Time</h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Last 7 days</span>
          </div>
          <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
        </div>

        {/* Three Column Row */}
        <div className="grid min-w-0 gap-3 xl:grid-cols-3">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Top Countries</h3>
            <TopCountries data={countries || []} isLoading={countriesLoading} />
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Top Referrers</h3>
            <TopReferrers data={referrers || []} isLoading={referrersLoading} />
          </div>
        </div>

        {/* QR Code Analytics — separated from total link analytics.
            All data here is filtered to clicks where isQrScan=true (set
            by the redirect handler when ?source=qr is on the URL). */}
        <div className="overflow-hidden rounded-xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <QrCode className="h-4 w-4 text-violet-600" />
              QR Code Analytics
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Last 7 days</span>
          </div>

          {/* QR-specific KPIs */}
          <div className="mb-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <KPICard compact label="QR Scans" value={qrOverview?.totalClicks || 0} growth={qrOverview?.clicksGrowth} isLoading={qrOverviewLoading} />
            <KPICard compact label="Unique" value={qrOverview?.uniqueClicks || 0} isLoading={qrOverviewLoading} />
            <KPICard compact label="Today" value={qrOverview?.clicksToday || 0} isLoading={qrOverviewLoading} />
            <KPICard compact label="Top Country" value={qrOverview?.topCountryCount ?? 0} subValue={qrOverview?.topCountry && qrOverview.topCountry !== "Unknown" ? qrOverview.topCountry : "—"} isLoading={qrOverviewLoading} />
          </div>

          {/* QR scans over time */}
          <div className="mb-3">
            <ClicksChart data={qrTimeSeries || []} isLoading={qrTimeSeriesLoading} />
          </div>

          {/* QR-specific top countries / devices */}
          <div className="grid min-w-0 gap-3 xl:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Top Countries (QR)</h4>
              <TopCountries data={qrCountries || []} isLoading={qrCountriesLoading} />
            </div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Device Breakdown (QR)</h4>
              <DonutChart data={qrDevices || []} isLoading={qrDevicesLoading} />
            </div>
          </div>
        </div>

        {/* Live Activity */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Live Activity</h3>
          <RealtimeClicks
            slug={link.slug}
            overviewMobilePercent={devices?.find((d: any) => d.label?.toLowerCase() === 'mobile')?.percentage || 0}
            overviewDirectPercent={referrers?.find((d: any) => d.label?.toLowerCase() === 'direct')?.percentage || 0}
          />
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

const tagPalette = [
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#e0e7ff", text: "#3730a3" },
  { bg: "#f3e8ff", text: "#6b21a8" },
  { bg: "#ccfbf1", text: "#115e59" },
  { bg: "#ffe4e6", text: "#9f1239" },
  { bg: "#fef9c3", text: "#854d0e" },
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#e5e7eb", text: "#374151" },
  { bg: "#ffedd5", text: "#9a3412" },
];

function tagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagPalette[Math.abs(hash) % tagPalette.length];
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
  const router = useRouter();
  const role = workspace?.role;
  const isViewer = role === "viewer";
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [advancedPrefill, setAdvancedPrefill] = useState<{ id?: string; destination?: string; slug?: string }>({});
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const { copied, copy } = useClipboard();
  const [createdLink, setCreatedLink] = useState<{ slug: string; shortUrl: string; destination: string } | null>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [localFolders, setLocalFolders] = useState<FolderItem[]>(folders);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedFolderId, selectedTags, searchQuery]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkFolderOpen, setBulkFolderOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: realtimeLinksData, isLoading: realtimeLinksLoading } = useQuery<{
    links: LinkRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["links", workspaceId, selectedFolderId, selectedTags, searchQuery, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("workspaceId", workspaceId);
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      
      const res = await fetch(`/api/links?${params.toString()}`);
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

  // Note: lastEvent was deprecated - real-time updates now handled via React Query refetchInterval
  // Keeping this effect for potential future use but it's no-op currently
  useEffect(() => {
    // Real-time link updates are handled by the query's refetchInterval
    // This effect kept for debugging purposes
  }, [realtimeLinksData, workspaceId]);

  useEffect(() => {
    if (realtimeFoldersData?.folders) {
      setLocalFolders(realtimeFoldersData.folders);
    }
  }, [realtimeFoldersData]);

  const allFoldersWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((link) => {
      if (link.folderId) {
        counts[link.folderId] = (counts[link.folderId] || 0) + 1;
      }
    });
    return localFolders.map((f) => ({
      ...f,
      linkCount: counts[f.id] || 0,
    }));
  }, [localFolders, links]);

  // Server-side filtering now handles folder, tags, and search
  // Client-side just displays the paginated results from API
  const filteredLinks = useMemo(() => {
    return [...links];
  }, [links]);

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

useEffect(() => {
  const pendingDest = sessionStorage.getItem("pendingLinkDestination");
  if (pendingDest) {
    sessionStorage.removeItem("pendingLinkDestination");
    const pendingSlug = sessionStorage.getItem("pendingLinkSlug");
    sessionStorage.removeItem("pendingLinkSlug");
    openAdvanced({ destination: pendingDest, slug: pendingSlug || undefined });
  }
}, []);

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

  async function runBulkAction(action: string, extra: Record<string, unknown> = {}) {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    try {
      const res = await fetch("/api/links/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          ids: Array.from(selectedIds),
          action,
          ...extra,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Bulk operation failed", err);
        return;
      }
      if (action === "delete") {
        setLinks((prev) => prev.filter((l) => !selectedIds.has(l.id)));
      } else {
        const linksRes = await fetch(`/api/links?workspaceId=${workspaceId}`);
        if (linksRes.ok) {
          const data = await linksRes.json();
          setLinks(data.links);
        }
      }
      clearSelection();
    } catch (e) {
      console.error("Bulk operation error", e);
    } finally {
      setBulkRunning(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-5">
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
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              Bulk Create
            </button>
          )}
          <button
            type="button"
            onClick={() => exportCSV(links)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/link-checker")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Check Links
          </button>
          <button
            type="button"
            onClick={() => !isViewer && openAdvanced({})}
            disabled={isViewer}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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
              folders={allFoldersWithCounts}
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
              {realtimeLinksData?.pagination?.total ?? filteredLinks.length} {realtimeLinksData?.pagination?.total === 1 ? "link" : "links"}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          role="toolbar"
          aria-label={`${selectedIds.size} links selected`}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm dark:border-primary/30 dark:bg-primary/10"
        >
          <span className="text-sm font-semibold text-foreground whitespace-nowrap mr-1">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-muted-foreground hover:text-foreground underline mr-2 cursor-pointer"
          >
            Clear
          </button>
          <div className="h-5 w-px bg-border mx-1" />
          {!isViewer && (
            <>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkRunning}
                aria-label="Delete selected links"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("toggleActive", { isActive: true })}
                disabled={bulkRunning}
                aria-label="Activate selected links"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all disabled:opacity-50 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Activate
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("toggleActive", { isActive: false })}
                disabled={bulkRunning}
                aria-label="Archive selected links"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all disabled:opacity-50 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 dark:hover:border-amber-800"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
              <button
                type="button"
                onClick={() => setBulkFolderOpen(true)}
                disabled={bulkRunning}
                aria-label="Move selected links to folder"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all disabled:opacity-50 dark:hover:bg-violet-950/30 dark:hover:text-violet-400 dark:hover:border-violet-800"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Move
              </button>
              <button
                type="button"
                onClick={() => setBulkTagOpen(true)}
                disabled={bulkRunning}
                aria-label="Manage tags on selected links"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-50 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 dark:hover:border-blue-800"
              >
                <TagIcon className="h-3.5 w-3.5" />
                Tags
              </button>
            </>
          )}
          {bulkRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />}
        </motion.div>
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="w-10 px-1 py-3 font-medium">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : selectedIds.size > 0 ? (
                      <MinusSquare className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-2 py-3 font-medium">Short URL</th>
                <th className="w-14 px-2 py-3 text-center font-medium" title="Clicks"><BarChart2 className="h-3.5 w-3.5 mx-auto" /></th>
                <th className="w-14 px-2 py-3 text-center font-medium hidden sm:table-cell" title="Unique visitors"><Users className="h-3.5 w-3.5 mx-auto" /></th>
                <th className="w-20 px-2 py-3 text-center font-medium hidden lg:table-cell" title="Created date"><Calendar className="h-3.5 w-3.5 mx-auto" /></th>
                <th className="w-8 px-2 py-3 text-center font-medium hidden lg:table-cell" title="A/B testing"><FlaskConical className="h-3.5 w-3.5 mx-auto" /></th>
                <th className="w-24 px-2 py-3 text-center font-medium hidden xl:table-cell" title="Folder"><Folder className="h-3.5 w-3.5 mx-auto" /></th>
                <th className="px-2 py-3 font-medium hidden xl:table-cell">Tags</th>
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filteredLinks.map((link) => {
                  const shortUrl = `https://${defaultDomain}/${link.slug}`;
                  const isExpanded = expandedId === link.id;
                  const isCopied = copied === link.id;
                  const displayFolder = link.folderId ? localFolders.find((f) => f.id === link.folderId) : null;
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
                        {/* Checkbox + Expand */}
                        <td className="px-1 py-3 w-10">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => toggleSelect(link.id)}
                              aria-label={selectedIds.has(link.id) ? "Deselect link" : "Select link"}
                              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                            >
                              {selectedIds.has(link.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExpand(link.id)}
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                              />
                            </button>
                          </div>
                        </td>

                        {/* Short URL */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => copy(shortUrl, link.id)}
                              className="truncate font-mono text-sm font-medium text-slate-800 hover:text-primary transition-colors dark:text-slate-200 dark:hover:text-primary"
                              title="Click to copy"
                            >
                              {defaultDomain}/{link.slug}
                            </button>
                            {isCopied && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-slate-100"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <Link
                              href={`/dashboard/qr?focus=${encodeURIComponent(link.id)}`}
                              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-slate-100"
                              title="Manage QR code"
                            >
                              <QrCode className="h-3 w-3" />
                            </Link>
                            {link.password && (
                              <span className="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:bg-amber-950 dark:text-amber-400" title="Password protected">L</span>
                            )}
                            {(link as any).scheduledAt && new Date((link as any).scheduledAt) > new Date() && (
                              <span className="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400" title="Scheduled">S</span>
                            )}
                            {(link as any).routingRules?.length > 0 && (
                              <span className="shrink-0 rounded bg-violet-50 px-1 py-0.5 text-[9px] font-bold text-violet-600 dark:bg-violet-950 dark:text-violet-400" title="Has routing rules">R</span>
                            )}
                          </div>
                        </td>

                        {/* Clicks */}
                        <td className="px-2 py-3 text-center tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100 w-14">
                          {link.totalClicks ?? 0}
                        </td>

                        {/* Unique */}
                        <td className="px-2 py-3 text-center tabular-nums text-xs text-slate-500 hidden sm:table-cell dark:text-slate-400 w-14">
                          {link.uniqueClicks ?? 0}
                        </td>

                        {/* Created */}
                        <td className="hidden lg:table-cell px-2 py-3 text-center whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 w-20">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </td>

                        {/* A/B */}
                        <td className="hidden lg:table-cell px-2 py-3 text-center w-8">
                          {(link as any).abTestEnabled ? (
                            <Link
                              href={`/dashboard/links/${link.id}/ab-test`}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-violet-500 hover:bg-violet-50 transition-colors dark:hover:bg-violet-950/30"
                              title="A/B test active"
                            >
                              <FlaskConical className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="text-slate-200 dark:text-slate-700">—</span>
                          )}
                        </td>

                        {/* Folder (read-only) */}
                        <td className="hidden xl:table-cell px-2 py-3 text-center w-24">
                          {displayFolder ? (
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
                              style={{
                                backgroundColor: displayFolder.color + "18",
                                color: displayFolder.color
                              }}
                            >
                              <Folder className="h-3 w-3" />
                              {displayFolder.name}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Tags */}
                        <td className="hidden xl:table-cell px-2 py-3">
                          {link.tags && link.tags.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {link.tags.map((t) => {
                                const c = tagColor(t);
                                return (
                                  <span
                                    key={t}
                                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
                                    style={{ backgroundColor: c.bg, color: c.text }}
                                  >
                                    {t}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-3 w-10">
                          <DropdownMenu.DropdownMenu open={actionMenuId === link.id} onOpenChange={(o) => setActionMenuId(o ? link.id : null)}>
                            <DropdownMenu.DropdownMenuTrigger
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
                              title="More actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenu.DropdownMenuTrigger>
                            <DropdownMenu.DropdownMenuContent align="end" className="w-36">
                              {!isViewer && (
                                <DropdownMenu.DropdownMenuItem onClick={() => { openAdvanced({ id: link.id }); setActionMenuId(null); }}>
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </DropdownMenu.DropdownMenuItem>
                              )}
                              {!isViewer && (
                                <DropdownMenu.DropdownMenuItem onClick={() => { setDeleteId(link.id); setActionMenuId(null); }} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenu.DropdownMenuItem>
                              )}
                            </DropdownMenu.DropdownMenuContent>
                          </DropdownMenu.DropdownMenu>
                        </td>
                      </motion.tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <td colSpan={9} className="p-0">
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

      {/* QR customization lives on /dashboard/qr. The links page now shows
          a small QR thumbnail in each row and a "Manage QR" link that
          opens the QR page with the card focused so the user lands on
          the QR they wanted to edit. No inline customize UI is rendered
          here on purpose. */}

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

      {/* Bulk Delete Confirmation */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Delete links confirmation">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Delete {selectedIds.size} links?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This action cannot be undone. All analytics data for these links will also be removed.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkRunning}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { runBulkAction("delete"); setBulkDeleteOpen(false); }}
                disabled={bulkRunning}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete {selectedIds.size} links
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move to Folder */}
      {bulkFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Move links to folder">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Move {selectedIds.size} links</h3>
            <p className="mt-1 text-sm text-muted-foreground">Choose a folder to move the selected links into.</p>
            <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { runBulkAction("moveFolder", { folderId: null }); setBulkFolderOpen(false); }}
                className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-muted-foreground italic">No folder (remove from folder)</span>
              </button>
              {localFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { runBulkAction("moveFolder", { folderId: f.id }); setBulkFolderOpen(false); }}
                  className="w-full flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                  style={{ borderLeft: `3px solid ${f.color}` }}
                >
                  <Folder className="h-4 w-4 shrink-0" style={{ color: f.color }} />
                  {f.name}
                </button>
              ))}
              {localFolders.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">No folders yet. Create one from the filter bar.</p>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setBulkFolderOpen(false)}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Management */}
      {bulkTagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Manage tags">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Manage Tags</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add or remove tags from {selectedIds.size} selected links.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="bulk-tag-input" className="text-xs font-medium text-foreground mb-1 block">Enter tags (comma-separated)</label>
                <input
                  id="bulk-tag-input"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="e.g. marketing, campaign, q1"
                  autoFocus
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const tags = bulkTagInput.split(",").map((t) => t.trim()).filter(Boolean);
                      if (tags.length > 0) runBulkAction("addTags", { tags });
                      setBulkTagInput("");
                      setBulkTagOpen(false);
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tags = bulkTagInput.split(",").map((t) => t.trim()).filter(Boolean);
                    if (tags.length > 0) runBulkAction("addTags", { tags });
                    setBulkTagInput("");
                    setBulkTagOpen(false);
                  }}
                  disabled={bulkRunning || !bulkTagInput.trim()}
                  className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {bulkRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Tags
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tags = bulkTagInput.split(",").map((t) => t.trim()).filter(Boolean);
                    if (tags.length > 0) runBulkAction("removeTags", { tags });
                    setBulkTagInput("");
                    setBulkTagOpen(false);
                  }}
                  disabled={bulkRunning || !bulkTagInput.trim()}
                  className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {bulkRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                  Remove Tags
                </button>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Existing tags:</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.length > 0 ? allTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      runBulkAction("addTags", { tags: [t.name] });
                      setBulkTagOpen(false);
                    }}
                    className="inline-flex cursor-pointer items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    +{t.name}
                  </button>
                )) : (
                  <span className="text-xs text-muted-foreground">No tags exist yet</span>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setBulkTagOpen(false)}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

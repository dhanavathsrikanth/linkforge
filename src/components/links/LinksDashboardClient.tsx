"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, Plus, QrCode, ChevronDown, BarChart2, MousePointerClick, Globe, Monitor, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useClipboard } from "@/hooks/use-clipboard";
import { QuickCreateBar } from "./QuickCreateBar";
import { AdvancedCreateSheet } from "./AdvancedCreateSheet";
import { QRCustomizePanel } from "@/components/qr/QRCustomizePanel";
import { RealtimeClicks } from "@/components/analytics/RealtimeClicks";
import { KPICard } from "@/components/analytics/KPICard";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { TopCountries } from "@/components/analytics/TopCountries";
import { DonutChart } from "@/components/analytics/DonutChart";
import { TopReferrers } from "@/components/analytics/TopReferrers";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import { getShortLinkBase } from "@/lib/utils";

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  tags: string[];
  totalClicks: number;
  uniqueClicks: number;
  createdAt: string | Date;
  isActive?: boolean;
  password?: string | null;
  expiresAt?: string | Date | null;
  clickLimit?: number | null;
  qrSettings?: QRSettings | null;
};

type Props = {
  workspaceId: string;
  initialLinks: LinkRow[];
  defaultDomain?: string;
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
      <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
        {/* KPI Cards Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KPICard label="Total Clicks" value={overview?.totalClicks || 0} growth={overview?.clicksGrowth} isLoading={overviewLoading} />
          <KPICard label="Unique Visitors" value={overview?.uniqueClicks || 0} isLoading={overviewLoading} />
          <KPICard label="Today" value={overview?.clicksToday || 0} isLoading={overviewLoading} />
          <KPICard label="Top Device" value={0} subValue={overview?.topDevice && overview.topDevice !== "unknown" ? overview.topDevice : "—"} isLoading={overviewLoading} />
          <KPICard label="Top Country" value={0} subValue={overview?.topCountry && overview.topCountry !== "Unknown" ? overview.topCountry : "—"} isLoading={overviewLoading} />
        </div>

        {/* Clicks Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Clicks Over Time</h3>
            <span className="text-[11px] text-muted-foreground">Last 7 days</span>
          </div>
          <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
        </div>

        {/* Three Column Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Top Countries</h3>
            <TopCountries data={countries || []} isLoading={countriesLoading} />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Device Breakdown</h3>
            <DonutChart data={devices || []} isLoading={devicesLoading} />
            {devices && devices.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {devices.slice(0, 3).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981"][i] }} />
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Top Referrers</h3>
            <TopReferrers data={referrers || []} isLoading={referrersLoading} />
          </div>
        </div>

        {/* Live Activity */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Live Activity</h3>
          <RealtimeClicks slug={link.slug} />
        </div>
      </div>
    </motion.div>
  );
}

export function LinksDashboardClient({
  workspaceId,
  initialLinks,
  defaultDomain = getShortLinkBase(),
}: Props) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedPrefill, setAdvancedPrefill] = useState<{ destination?: string; slug?: string }>({});
  const [qrLinkId, setQrLinkId] = useState<string | null>(null);
  const { copied, copy } = useClipboard();
  const qrLink = links.find((l) => l.id === qrLinkId) ?? null;

  function handleCreated(link: any) {
    setLinks((prev) => [link as LinkRow, ...prev.filter((l) => l.id !== link.id)]);
  }

  function openAdvanced(prefill: { destination?: string; slug?: string }) {
    setAdvancedPrefill(prefill);
    setAdvancedOpen(true);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Links</h1>
          <p className="text-sm text-muted-foreground">
            Manage your short links and track their performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAdvanced({})}
          className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Create Link
        </button>
      </div>

      <QuickCreateBar
        workspaceId={workspaceId}
        defaultDomain={defaultDomain}
        onCreated={handleCreated}
        onAdvanced={openAdvanced}
      />

      {links.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <BarChart2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Create your first link</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Paste a URL above to instantly shorten it, or click Create Link for advanced options.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 w-8"></th>
                <th className="px-5 py-3 font-semibold">Link</th>
                <th className="px-5 py-3 font-semibold hidden sm:table-cell">Short URL</th>
                <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                <th className="px-5 py-3 text-right font-semibold hidden md:table-cell">Unique</th>
                <th className="px-5 py-3 font-semibold hidden lg:table-cell">Created</th>
                <th className="px-5 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {links.map((link) => {
                  const shortUrl = `https://${defaultDomain}/${link.slug}`;
                  const isExpanded = expandedId === link.id;
                  const isCopied = copied === link.id;
                  return (
                    <motion.tr
                      key={link.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className={`border-b border-border last:border-b-0 transition-colors ${isExpanded ? "bg-muted/30" : "hover:bg-muted/40"}`}
                    >
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(link.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                          />
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-foreground max-w-[200px] lg:max-w-[280px]">
                            {link.title || link.destination.replace(/^https?:\/\//, "")}
                          </p>
                          {link.password && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                              Locked
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[300px]">
                          {link.destination}
                        </p>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copy(shortUrl, link.id)}
                            className="group inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            title="Click to copy"
                          >
                            {defaultDomain}/{link.slug}
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
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
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">
                        {link.totalClicks ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {link.uniqueClicks ?? 0}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => toggleExpand(link.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-slate-600 hover:bg-slate-100 transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
                            title="Analytics"
                          >
                            <BarChart2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { copy(shortUrl, link.id); }}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors sm:hidden"
                            title="Copy"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrLinkId(link.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-slate-600 hover:bg-slate-100 transition-colors dark:hover:text-slate-300 dark:hover:bg-slate-800"
                            title="QR Code"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {links.map((link) => (
                <tr key={`exp-${link.id}`} className="border-b border-border last:border-b-0">
                  <td colSpan={7} className="p-0">
                    <AnimatePresence>
                      {expandedId === link.id && (
                        <ExpandedRow link={link} workspaceId={workspaceId} />
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdvancedCreateSheet
        workspaceId={workspaceId}
        defaultDomain={defaultDomain}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        prefill={advancedPrefill}
        onCreated={handleCreated}
      />

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
    </div>
  );
}

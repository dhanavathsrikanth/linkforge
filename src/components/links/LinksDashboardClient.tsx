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

function OverviewCards({ linkId, workspaceId }: { linkId: string; workspaceId: string }) {
  const { data } = useQuery<any>({
    queryKey: ["analytics", "overview", workspaceId, "7d", linkId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${workspaceId}&range=7d&linkId=${linkId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const cards = [
    { label: "Total Clicks", value: data?.totalClicks ?? 0, icon: MousePointerClick, iconBg: "bg-violet-100 dark:bg-violet-900/40", iconColor: "text-violet-600 dark:text-violet-400" },
    { label: "Unique Clicks", value: data?.uniqueClicks ?? 0, icon: TrendingUp, iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Today", value: data?.clicksToday ?? 0, icon: BarChart2, iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
    { label: "Top Device", value: data?.topDevice || "—", icon: Monitor, iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400" },
    { label: "Top Country", value: data?.topCountry || "—", icon: Globe, iconBg: "bg-rose-100 dark:bg-rose-900/40", iconColor: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`flex h-6 w-6 items-center justify-center rounded-md ${c.iconBg} ${c.iconColor}`}>
              <c.icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
          </div>
          <p className="text-lg font-bold text-foreground tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function BreakdownBars({ linkId, workspaceId, dimension, label }: { linkId: string; workspaceId: string; dimension: "device" | "country"; label: string }) {
  const { data } = useQuery<any[]>({
    queryKey: ["analytics", "breakdown", workspaceId, linkId, "7d", dimension],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/breakdown?workspaceId=${workspaceId}&range=7d&linkId=${linkId}&dimension=${dimension}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const items = data?.slice(0, dimension === "device" ? 4 : 6) ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</h4>
        <p className="text-xs text-muted-foreground">No data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</h4>
      <div className="space-y-1.5">
        {items.map((item: any, i: number) => {
          const hues = ["from-blue-500 to-indigo-500", "from-emerald-500 to-teal-500", "from-violet-500 to-purple-500", "from-amber-500 to-orange-500"];
          const gradient = hues[i % hues.length];
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground tabular-nums">{item.clicks}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all`}
                  style={{ width: `${Math.max(item.percentage, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniSparkline({ linkId, workspaceId }: { linkId: string; workspaceId: string }) {
  const { data } = useQuery<any[]>({
    queryKey: ["analytics", "timeseries", workspaceId, linkId, "7d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/timeseries?workspaceId=${workspaceId}&range=7d&linkId=${linkId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const points = data ?? [];
  const max = Math.max(...points.map((p: any) => p.clicks), 1);

  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Last 7 Days</h4>
        <p className="text-xs text-muted-foreground">No data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Last 7 Days</h4>
      <div className="flex items-end gap-1 h-16 pt-1">
        {points.map((p: any, i: number) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-blue-500 to-indigo-400 hover:from-blue-600 hover:to-indigo-500 transition-all min-h-[2px]"
              style={{ height: `${(p.clicks / max) * 100}%` }}
            />
            <span className="text-[9px] text-muted-foreground tabular-nums">
              {new Date(p.date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpandedRow({ link, workspaceId }: { link: LinkRow; workspaceId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
        <OverviewCards linkId={link.id} workspaceId={workspaceId} />

        <div className="grid grid-cols-3 gap-3">
          <MiniSparkline linkId={link.id} workspaceId={workspaceId} />
          <BreakdownBars linkId={link.id} workspaceId={workspaceId} dimension="device" label="Devices" />
          <BreakdownBars linkId={link.id} workspaceId={workspaceId} dimension="country" label="Countries" />
        </div>

        <div className="rounded-lg border border-border bg-card">
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

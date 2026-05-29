"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  MousePointerClick,
  Eye,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { BioAnalyticsResponse } from "@/app/api/bio/analytics/[galleryId]/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarAnalyticsProps {
  galleryId: string;
  isPublished: boolean;
}

type DateRange = 7 | 30;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-stone-200", className)} />
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-white border border-stone-200">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-xs text-stone-500">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className="text-xl font-bold text-stone-900 tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = new Date(label);
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-stone-700 mb-1">{formatted}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-stone-600">{p.name}:</span>
          <span className="font-semibold text-stone-900">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Device icon ─────────────────────────────────────────────────────────────

function DeviceIcon({ device }: { device: string }) {
  if (device === "mobile") return <Smartphone className="w-3.5 h-3.5 text-stone-400" />;
  if (device === "tablet") return <Tablet className="w-3.5 h-3.5 text-stone-400" />;
  return <Monitor className="w-3.5 h-3.5 text-stone-400" />;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
      {title}
    </p>
  );
}

// ─── SidebarAnalytics ─────────────────────────────────────────────────────────

export function SidebarAnalytics({ galleryId, isPublished }: SidebarAnalyticsProps) {
  const [data, setData] = useState<BioAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DateRange>(7);

  async function fetchData(d: DateRange) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bio/analytics/${galleryId}?days=${d}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if ((body as any).error?.code === "NOT_ENOUGH_DATA") {
          setError("not_enough_data");
        } else {
          setError("failed");
        }
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isPublished) fetchData(days);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId, isPublished, days]);

  // ── Not published ──────────────────────────────────────────────────────────
  if (!isPublished) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
          <h2 className="text-sm font-semibold text-stone-900">Analytics</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700 mb-1">Publish to see analytics</p>
          <p className="text-xs text-stone-400">
            Once your page is live, view and click data will appear here.
          </p>
        </div>
      </div>
    );
  }

  // ── Not enough data ────────────────────────────────────────────────────────
  if (!loading && error === "not_enough_data") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
          <h2 className="text-sm font-semibold text-stone-900">Analytics</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700 mb-1">Collecting data…</p>
          <p className="text-xs text-stone-400">
            We&apos;re still collecting data for this page. Check back in a few days.
          </p>
        </div>
      </div>
    );
  }

  const totals = data?.stats.totals;
  const chartData = data?.stats.data ?? [];
  const maxViews = Math.max(...chartData.map((d) => d.total_views), 1);
  const totalViews = totals?.views ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Analytics</h2>
          <p className="text-xs text-stone-500 mt-0.5">Last {days} days</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Date range toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-lg">
            {([7, 30] as DateRange[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                  days === d
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchData(days)}
            disabled={loading}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={Eye}              label="Views"   value={totals?.views ?? 0}          loading={loading} />
          <StatCard icon={Users}            label="Unique"  value={totals?.uniqueVisitors ?? 0} loading={loading} />
          <StatCard icon={MousePointerClick} label="Clicks" value={totals?.clicks ?? 0}         loading={loading} />
        </div>

        {/* ── Area chart ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 p-3">
          <p className="text-xs font-semibold text-stone-600 mb-3">Page views</p>
          {loading ? (
            <Skeleton className="h-[100px] w-full" />
          ) : chartData.length === 0 || maxViews === 0 ? (
            <div className="h-[100px] flex items-center justify-center">
              <p className="text-xs text-stone-400">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                  interval={days === 7 ? 1 : 6}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total_views"
                  name="Views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  fill="url(#viewsGrad)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="unique_visitors"
                  name="Unique"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#uniqueGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-stone-500">Views</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-stone-500">Unique</span>
            </div>
          </div>
        </div>

        {/* ── Top locations ────────────────────────────────────────────────── */}
        {(loading || (data?.locations?.length ?? 0) > 0) && (
          <div>
            <SectionHeader title="Top locations" />
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data!.locations.map((loc) => {
                    const pct = totalViews > 0 ? Math.round((loc.hits / totalViews) * 100) : 0;
                    return (
                      <div key={loc.location} className="flex items-center gap-2 px-3 py-2">
                        {/* Country flag */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://flag.vercel.app/s/${loc.location}.svg`}
                          alt={loc.location}
                          width={18}
                          height={13}
                          className="rounded-sm shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        {/* Bar */}
                        <div className="flex-1 relative h-6">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary/10 rounded"
                            style={{ width: `${pct}%`, minWidth: "4px" }}
                          />
                          <div className="absolute inset-y-0 left-2 flex items-center">
                            <span className="text-xs font-medium text-stone-700">{loc.location}</span>
                          </div>
                          <div className="absolute inset-y-0 right-0 flex items-center">
                            <span className="text-xs text-stone-400">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Top referrers ────────────────────────────────────────────────── */}
        {(loading || (data?.referrers?.length ?? 0) > 0) && (
          <div>
            <SectionHeader title="Top referrers" />
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data!.referrers.map((ref) => (
                    <div key={ref.referrer} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="text-xs text-stone-700 truncate">{ref.referrer}</span>
                      </div>
                      <span className="text-xs font-medium text-stone-500 shrink-0 ml-2">
                        {ref.hits.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Device breakdown ─────────────────────────────────────────────── */}
        {(loading || (data?.devices?.length ?? 0) > 0) && (
          <div>
            <SectionHeader title="Devices" />
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data!.devices.map((dev) => {
                    const pct = totalViews > 0 ? Math.round((dev.hits / totalViews) * 100) : 0;
                    return (
                      <div key={dev.device} className="flex items-center gap-2 px-3 py-2">
                        <DeviceIcon device={dev.device} />
                        <span className="text-xs text-stone-700 capitalize flex-1">{dev.device}</span>
                        <span className="text-xs text-stone-400">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Top blocks ───────────────────────────────────────────────────── */}
        {(loading || (data?.topBlocks?.length ?? 0) > 0) && (
          <div>
            <SectionHeader title="Top blocks" />
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {data!.topBlocks.map((b) => {
                    const total = b.clicks + b.submissions;
                    const maxTotal = Math.max(...data!.topBlocks.map((x) => x.clicks + x.submissions), 1);
                    const pct = Math.round((total / maxTotal) * 100);
                    // Human-readable block type label
                    const label = b.blockType
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <div key={b.blockId} className="flex items-center gap-2 px-3 py-2">
                        {/* Bar */}
                        <div className="flex-1 relative h-6">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary/10 rounded"
                            style={{ width: `${pct}%`, minWidth: "4px" }}
                          />
                          <div className="absolute inset-y-0 left-2 flex items-center">
                            <span className="text-xs font-medium text-stone-700 truncate max-w-[120px]">
                              {label}
                            </span>
                          </div>
                        </div>
                        {/* Counts */}
                        <div className="flex items-center gap-2 shrink-0">
                          {b.clicks > 0 && (
                            <span className="text-xs text-stone-500 flex items-center gap-0.5">
                              <MousePointerClick className="w-3 h-3" />
                              {b.clicks.toLocaleString()}
                            </span>
                          )}
                          {b.submissions > 0 && (
                            <span className="text-xs text-stone-500 flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {b.submissions.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && totalViews === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="w-8 h-8 text-stone-300 mb-2" />
            <p className="text-xs text-stone-400">No views yet for this period.</p>
            <p className="text-xs text-stone-400">Share your page to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, BarChart3, QrCode, Link2, MousePointerClick, TrendingUp, Users, CalendarDays, ArrowRight, Sparkles, Clock, Zap } from "lucide-react";
import { KPICard } from "@/components/analytics/KPICard";
import { ClicksChart } from "@/components/analytics/ClicksChart";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const quickActions = [
  { label: "Create Link", href: "/dashboard/links", icon: Plus, desc: "Shorten a new URL in seconds" },
  { label: "View Analytics", href: "/dashboard/analytics", icon: BarChart3, desc: "Track your link performance" },
  { label: "QR Codes", href: "/dashboard/qr", icon: QrCode, desc: "Generate and customize QR codes" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.firstName || user?.fullName || "there";

  const workspaceIdQuery = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces/current");
      const data = await res.json();
      return data.workspace?.id as string | undefined;
    },
  });

  const wsId = workspaceIdQuery.data;

  const { data: overview, isLoading: overviewLoading } = useQuery<any>({
    queryKey: ["analytics", "overview", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
  });

  const { data: last7d } = useQuery<any>({
    queryKey: ["analytics", "overview", wsId, "7d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${wsId}&range=7d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "timeseries", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/timeseries?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wsId,
  });

  const { data: linksCount } = useQuery<number>({
    queryKey: ["links", "count", wsId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/top-links?workspaceId=${wsId}&range=30d&limit=1`);
      if (!res.ok) return 0;
      return 0; // placeholder if no count endpoint
    },
    enabled: !!wsId,
  });

  const { data: recentLinks } = useQuery<any[]>({
    queryKey: ["links", "recent", wsId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/top-links?workspaceId=${wsId}&range=30d&limit=5`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wsId,
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Welcome back to your dashboard.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {today}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Clicks"
          value={overview?.totalClicks || 0}
          growth={overview?.clicksGrowth}
          isLoading={overviewLoading}
        />
        <KPICard
          label="Unique Visitors"
          value={overview?.uniqueClicks || 0}
          isLoading={overviewLoading}
        />
        <KPICard
          label="Clicks Today"
          value={last7d?.clicksToday || 0}
          isLoading={overviewLoading}
        />
        <KPICard
          label="Top Link"
          value={overview?.topLink?.clicks || 0}
          subValue={overview?.topLink ? `${overview.topLink.slug}` : "No clicks yet"}
          isLoading={overviewLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-600"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:group-hover:bg-violet-900/50">
              <action.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{action.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{action.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-violet-500 dark:text-slate-600" />
          </Link>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clicks Over Time</h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Last 30 days</span>
        </div>
        <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
      </div>

      {/* Recent Links & Top Link */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Links */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top Links</h2>
            <Link
              href="/dashboard/links"
              className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            >
              View all →
            </Link>
          </div>
          {!recentLinks || recentLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mb-3 dark:bg-slate-700">
                <Link2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No links yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create your first link to get started.
              </p>
              <Link
                href="/dashboard/links"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Create Link
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLinks.slice(0, 5).map((link: any, i: number) => (
                <Link
                  key={link.id}
                  href={`/dashboard/links/${link.id}/analytics`}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {link.title || link.slug}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {link.clicks.toLocaleString()} clicks
                    </p>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 dark:hover:text-violet-400">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <MousePointerClick className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">This Period</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {(overview?.totalClicks || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Growth</p>
                <p className={`text-sm font-semibold ${(overview?.clicksGrowth ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {overview?.clicksGrowth ?? 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unique Visitors</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {(overview?.uniqueClicks || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg CTR</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {overview?.averageCTR || 0}%
                </p>
              </div>
            </div>

            {overview?.topLink && (
              <div className="flex items-center justify-between rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-300">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Top Performing</p>
                    <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
                      /{overview.topLink.slug}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-violet-500">clicks</p>
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                    {overview.topLink.clicks.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {overview?.topCountry && overview.topCountry !== "Unknown" && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Top Country</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{overview.topCountry}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus, BarChart3, QrCode, Link2, MousePointerClick,
  TrendingUp, Users, CalendarDays, ArrowRight, Sparkles, Clock, Zap,
  ExternalLink,
} from "lucide-react";
import { KPICard } from "@/components/analytics/KPICard";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { InsightCard } from "@/components/analytics/InsightCard";
import { AudienceProfile } from "@/components/analytics/AudienceProfile";
import { PostingTimes } from "@/components/analytics/PostingTimes";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/providers/WorkspaceProvider";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric",
});

const quickActions = [
  { label: "Create Link", href: "/dashboard/links", icon: Plus, desc: "Shorten a new URL in seconds" },
  { label: "View Analytics", href: "/dashboard/analytics", icon: BarChart3, desc: "Track your link performance" },
  { label: "QR Codes", href: "/dashboard/qr", icon: QrCode, desc: "Generate and customize QR codes" },
];

const topLinkVariants = [
  { ring: "ring-violet-200", bg: "bg-violet-50", text: "text-violet-700" },
  { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700" },
  { ring: "ring-blue-200", bg: "bg-blue-50", text: "text-blue-700" },
  { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-700" },
  { ring: "ring-rose-200", bg: "bg-rose-50", text: "text-rose-700" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const firstName = user?.firstName || user?.fullName || "there";

  const wsId = workspace?.id;

  const { data: overview, isLoading: overviewLoading } = useQuery<any>({
    queryKey: ["analytics", "overview", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
    // Auto-refresh every 20s so the dashboard home tiles stay current with
    // live clicks without the user needing to reload the page.
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: last7d } = useQuery<any>({
    queryKey: ["analytics", "overview", wsId, "7d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/overview?workspaceId=${wsId}&range=7d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery<any[]>({
    queryKey: ["analytics", "timeseries", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/timeseries?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wsId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: topLinks } = useQuery<any[]>({
    queryKey: ["analytics", "top-links", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/top-links?workspaceId=${wsId}&range=30d&limit=5`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wsId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: postingTimes, isLoading: postingTimesLoading } = useQuery<any>({
    queryKey: ["analytics", "posting-times", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/posting-times?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: audience, isLoading: audienceLoading } = useQuery<any>({
    queryKey: ["analytics", "audience", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/audience?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<any>({
    queryKey: ["analytics", "insights", wsId, "30d"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/insights?workspaceId=${wsId}&range=30d`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!wsId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const ctr = overview?.totalClicks && overview?.uniqueClicks
    ? ((overview.uniqueClicks / overview.totalClicks) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm ring-1 ring-white/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-xs text-slate-500">Welcome back to your dashboard.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
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
          label="Deep Link Clicks"
          value={overview?.deepLinkClicks || 0}
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
          <Link key={action.href} href={action.href} className="group block">
            <Card className="cursor-pointer transition-all hover:border-violet-200 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500 truncate">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-violet-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-0">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">Clicks Over Time</CardTitle>
            <CardDescription className="text-xs">Last 30 days</CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] font-normal">Daily</Badge>
        </CardHeader>
        <CardContent className="p-5">
          <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
        </CardContent>
      </Card>

      {/* Smart Insights */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-900">Smart Insights</h2>
          </div>
          <Link
            href="/dashboard/analytics/insights"
            className="text-xs font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Actionable insight cards */}
        {insights?.insights?.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.insights.slice(0, 3).map((insight: any, i: number) => (
              <InsightCard key={i} {...insight} />
            ))}
          </div>
        )}

        {/* Audience + Posting times */}
        <div className="grid gap-4 lg:grid-cols-2">
          <AudienceProfile data={audience} isLoading={audienceLoading} />
          <PostingTimes data={postingTimes} isLoading={postingTimesLoading} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Links */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-0">
            <CardTitle className="text-sm font-semibold text-slate-900">Top Links</CardTitle>
            <Link
              href="/dashboard/links"
              className="text-xs font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            {!topLinks || topLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                  <Link2 className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">No links yet</p>
                <p className="text-xs text-slate-500 mt-0.5">Create your first link to get started.</p>
                <Link href="/dashboard/links" className="mt-3">
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Create Link
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {topLinks.slice(0, 5).map((link: any, i: number) => {
                  const v = topLinkVariants[i % topLinkVariants.length];
                  return (
                    <Link
                      key={link.id}
                      href={`/dashboard/links/${link.id}/analytics`}
                      className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${v.ring} ${v.bg} ${v.text} text-xs font-semibold`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-violet-700 transition-colors">
                          {link.title || link.slug}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          <span className="font-semibold">{link.clicks?.toLocaleString()}</span> clicks
                        </p>
                      </div>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-violet-600 group-hover:bg-violet-50 transition-all">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-sm font-semibold text-slate-900">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-3">
              {/* This Period */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <MousePointerClick className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">This Period</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(overview?.totalClicks || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Growth</p>
                  <p className={`text-sm font-semibold ${(overview?.clicksGrowth ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {overview?.clicksGrowth ?? 0}%
                  </p>
                </div>
              </div>

              {/* Unique Visitors */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Unique Visitors</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(overview?.uniqueClicks || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Avg CTR</p>
                  <p className="text-sm font-semibold text-slate-700">{ctr}%</p>
                </div>
              </div>

              <Separator className="my-1" />

              {/* Top Performing */}
              {overview?.topLink && (
                <Link
                  href={`/dashboard/links/${overview.topLink.id}/analytics`}
                  className="group flex items-center justify-between rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3.5 transition-all hover:from-violet-100 hover:to-fuchsia-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-200 text-violet-700">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-violet-600">Top Performing</p>
                      <p className="text-sm font-bold text-violet-900">/{overview.topLink.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-violet-500">clicks</p>
                    <p className="text-lg font-bold text-violet-700">
                      {overview.topLink.clicks.toLocaleString()}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-2 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}

              {/* Top Country */}
              {overview?.topCountry && overview.topCountry !== "Unknown" && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Top Country</p>
                      <p className="text-sm font-bold text-slate-900">{overview.topCountry}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                    Leader
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

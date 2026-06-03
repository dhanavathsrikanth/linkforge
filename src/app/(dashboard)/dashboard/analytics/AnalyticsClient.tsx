"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DateRange } from "@/hooks/analytics";
import {
  useAnalyticsOverview,
  useAnalyticsTimeSeries,
  useAnalyticsBreakdown,
  useAnalyticsTopLinks,
} from "@/hooks/analytics";
import { DateRangePicker as DateRangePickerComponent } from "@/components/analytics/DateRangePicker";
import { KPICard } from "@/components/analytics/KPICard";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { TopCountries } from "@/components/analytics/TopCountries";
import { DonutChart } from "@/components/analytics/DonutChart";
import { TopReferrers } from "@/components/analytics/TopReferrers";
import { TopLinksTable } from "@/components/analytics/TopLinksTable";
import { BioAnalyticsSection } from "@/components/analytics/BioAnalyticsSection";
import { BarChart3, ArrowRight, Route, DollarSign, MousePointerClick, Sparkles, Link2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsClientProps {
  workspaceId: string;
}

type Tab = "links" | "bio";

export function AnalyticsClient({ workspaceId }: AnalyticsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("links");
  const [range, setRange] = useState<DateRange>("30d");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();

  const handleRangeChange = (newRange: DateRange, newFrom?: string, newTo?: string) => {
    setRange(newRange);
    setFrom(newFrom);
    setTo(newTo);
  };

  // Fetch all analytics data
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(workspaceId, range, from, to);
  const { data: timeSeries, isLoading: timeSeriesLoading } = useAnalyticsTimeSeries(workspaceId, undefined, range);
  const { data: countries, isLoading: countriesLoading } = useAnalyticsBreakdown(workspaceId, undefined, range, "country");
  const { data: devices, isLoading: devicesLoading } = useAnalyticsBreakdown(workspaceId, undefined, range, "device");
  const { data: referrers, isLoading: referrersLoading } = useAnalyticsBreakdown(workspaceId, undefined, range, "referrer");
  const { data: topLinks, isLoading: topLinksLoading } = useAnalyticsTopLinks(workspaceId, range, 10, from, to);

  const handleLinkClick = (linkId: string) => {
    router.push(`/dashboard/links/${linkId}/analytics`);
  };

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "Custom range";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track your link performance across all channels.</p>
        </div>
        <DateRangePickerComponent value={range} onChange={handleRangeChange} />
      </div>

      {/* Attribution Hero Card */}
      <Link
        href="/dashboard/analytics/attribution"
        className="group block rounded-xl border border-border bg-gradient-to-r from-primary/5 via-primary/[0.02] to-background p-6 hover:border-primary/30 transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                Multi-Touch Attribution
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Understand how every link contributes to conversions across the full customer journey.
                First-touch, last-touch, linear, and time-decay models built in.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Route className="h-3 w-3" />
                  Customer paths
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  Revenue attribution
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MousePointerClick className="h-3 w-3" />
                  4 models
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </Link>

      {/* Insights Hero Card */}
      <Link
        href="/dashboard/analytics/insights"
        className="group block rounded-xl border border-border bg-gradient-to-r from-violet-500/5 to-fuchsia-500/[0.02] p-6 hover:border-violet-300/30 transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 group-hover:from-violet-500/20 group-hover:to-indigo-500/20 transition-colors">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-violet-600 transition-colors">
                Smart Insights
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                AI-powered recommendations on posting times, audience profiles, growth trends, and actionable opportunities — built from your click data.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  Best posting times
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  Audience intelligence
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  Growth alerts
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-violet-500/10 transition-colors shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-600 transition-colors" />
          </div>
        </div>
      </Link>

      {/* Row 1 - KPI Cards */}
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
          label="Top Link"
          value={overview?.topLink?.clicks || 0}
          subValue={overview?.topLink ? `${overview.topLink.slug}` : "No clicks yet"}
          isLoading={overviewLoading}
        />
        <KPICard
          label="Deep Link Clicks"
          value={overview?.deepLinkClicks || 0}
          isLoading={overviewLoading}
        />
      </div>

      {/* Row 2 - Main Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Clicks Over Time</h2>
          <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        </div>
        <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
      </div>

      {/* Row 3 - Three Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Countries */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Top Countries</h2>
          <TopCountries data={countries || []} isLoading={countriesLoading} />
        </div>

        {/* Device Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Device Breakdown</h2>
          <DonutChart data={devices || []} isLoading={devicesLoading} />
          {devices && devices.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {devices.slice(0, 3).map((device, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981"][i] }}
                  />
                  <span className="text-sm text-muted-foreground">{device.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Top Referrers</h2>
          <TopReferrers data={referrers || []} isLoading={referrersLoading} />
        </div>
      </div>

      {/* Row 4 - Top Links Table */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Top Links</h2>
          <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        </div>
        <TopLinksTable 
          data={topLinks || []} 
          isLoading={topLinksLoading} 
          onRowClick={handleLinkClick}
        />
      </div>
    </div>
  );
}
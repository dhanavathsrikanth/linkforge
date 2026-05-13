"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface AnalyticsClientProps {
  workspaceId: string;
}

export function AnalyticsClient({ workspaceId }: AnalyticsClientProps) {
  const router = useRouter();
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Analytics</h1>
          <p className="text-sm text-slate-600">Track your link performance across all channels.</p>
        </div>
        <DateRangePickerComponent value={range} onChange={handleRangeChange} />
      </div>

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
          label="Click-through Rate"
          value={overview?.averageCTR || 0}
          suffix="%"
          isLoading={overviewLoading}
        />
      </div>

      {/* Row 2 - Main Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Clicks Over Time</h2>
          <span className="text-sm text-slate-500">{rangeLabel}</span>
        </div>
        <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
      </div>

      {/* Row 3 - Three Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Countries */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Top Countries</h2>
          <TopCountries data={countries || []} isLoading={countriesLoading} />
        </div>

        {/* Device Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Device Breakdown</h2>
          <DonutChart data={devices || []} isLoading={devicesLoading} />
          {devices && devices.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {devices.slice(0, 3).map((device, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981"][i] }}
                  />
                  <span className="text-sm text-slate-600">{device.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Top Referrers</h2>
          <TopReferrers data={referrers || []} isLoading={referrersLoading} />
        </div>
      </div>

      {/* Row 4 - Top Links Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Top Links</h2>
          <span className="text-sm text-slate-500">{rangeLabel}</span>
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
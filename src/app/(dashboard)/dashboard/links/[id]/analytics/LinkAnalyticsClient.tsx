"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DateRange } from "@/hooks/analytics";
import {
  useAnalyticsOverview,
  useAnalyticsTimeSeries,
  useAnalyticsBreakdown,
} from "@/hooks/analytics";
import { DateRangePicker as DateRangePickerComponent } from "@/components/analytics/DateRangePicker";
import { KPICard } from "@/components/analytics/KPICard";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { TopCountries } from "@/components/analytics/TopCountries";
import { DonutChart } from "@/components/analytics/DonutChart";

interface LinkAnalyticsClientProps {
  linkId: string;
  workspaceId: string;
}

// Simple world map component using CSS (no external library needed)
function WorldMap() {
  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-lg bg-slate-900">
      <svg
        viewBox="0 0 1000 500"
        className="h-full w-full"
        style={{ opacity: 0.3 }}
      >
        {/* Simplified world map paths */}
        <path
          fill="#8b5cf6"
          d="M150,120 Q200,100 250,120 Q300,140 280,180 Q260,220 200,200 Q150,180 150,120"
        />
        <path
          fill="#8b5cf6"
          d="M300,150 Q350,130 400,150 Q450,170 430,210 Q410,250 350,230 Q300,210 300,150"
        />
        <path
          fill="#3b82f6"
          d="M450,100 Q500,80 550,100 Q600,120 580,160 Q560,200 500,180 Q450,160 450,100"
        />
        <path
          fill="#8b5cf6"
          d="M500,200 Q550,180 600,200 Q650,220 630,260 Q610,300 550,280 Q500,260 500,200"
        />
        <path
          fill="#3b82f6"
          d="M700,150 Q750,130 800,150 Q850,170 830,210 Q810,250 750,230 Q700,210 700,150"
        />
        <path
          fill="#8b5cf6"
          d="M800,180 Q850,160 900,180 Q950,200 930,240 Q910,280 850,260 Q800,240 800,180"
        />
        <path
          fill="#3b82f6"
          d="M200,300 Q250,280 300,300 Q350,320 330,360 Q310,400 250,380 Q200,360 200,300"
        />
        <path
          fill="#8b5cf6"
          d="M550,300 Q600,280 650,300 Q700,320 680,360 Q660,400 600,380 Q550,360 550,300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-slate-400">Click data by region</p>
      </div>
    </div>
  );
}

// A/B Test Results Panel
function ABTestPanel() {
  const isLoading = false;
  const abEnabled = false; // This would come from the link data

  if (!abEnabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">A/B Test Results</h2>
        <div className="flex h-40 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-slate-500">A/B testing is not enabled for this link</p>
            <Link
              href="#"
              className="mt-2 inline-block text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Enable A/B testing →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Mock A/B test data
  const variantA = { clicks: 1250, conversions: 89, rate: 7.1 };
  const variantB = { clicks: 1340, conversions: 112, rate: 8.4 };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-950">A/B Test Results</h2>
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-slate-950">Variant A</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Control</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-950">{variantA.clicks.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Clicks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-950">{variantA.conversions}</p>
                <p className="text-xs text-slate-500">Conversions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-950">{variantA.rate}%</p>
                <p className="text-xs text-slate-500">Conv. Rate</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-slate-950">Variant B</span>
              <span className="rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-600">Winner</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-950">{variantB.clicks.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Clicks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-950">{variantB.conversions}</p>
                <p className="text-xs text-slate-500">Conversions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-950">{variantB.rate}%</p>
                <p className="text-xs text-slate-500">Conv. Rate</p>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500">
            <span className="font-medium text-emerald-600">Statistically significant</span> — B performs 18.3% better
          </p>
        </div>
      )}
    </div>
  );
}

export function LinkAnalyticsClient({ linkId, workspaceId }: LinkAnalyticsClientProps) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>("30d");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();

  const handleRangeChange = (newRange: DateRange, newFrom?: string, newTo?: string) => {
    setRange(newRange);
    setFrom(newFrom);
    setTo(newTo);
  };

  // Fetch analytics data for this specific link
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(workspaceId, range, from, to);
  const { data: timeSeries, isLoading: timeSeriesLoading } = useAnalyticsTimeSeries(workspaceId, linkId, range);
  const { data: countries, isLoading: countriesLoading } = useAnalyticsBreakdown(workspaceId, linkId, range, "country");
  const { data: devices, isLoading: devicesLoading } = useAnalyticsBreakdown(workspaceId, linkId, range, "device");

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "Custom range";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/links"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Link Analytics</h1>
            <p className="text-sm text-slate-600">{rangeLabel}</p>
          </div>
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
          label="Clicks Today"
          value={overview?.clicksToday || 0}
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
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Click Timeline</h2>
        <ClicksChart data={timeSeries || []} isLoading={timeSeriesLoading} />
      </div>

      {/* Row 3 - Geographic Map & Device Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Geographic Map */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Geographic Distribution</h2>
          <WorldMap />
          <div className="mt-4">
            <TopCountries data={countries || []} isLoading={countriesLoading} />
          </div>
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
                  <span className="text-sm font-medium text-slate-900">{device.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4 - A/B Test Results */}
      <ABTestPanel />
    </div>
  );
}
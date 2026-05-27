"use client";

import { useState } from "react";
import { Sparkles, Clock, Users, Lightbulb, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { DateRange } from "@/hooks/analytics";
import {
  useAnalyticsInsights,
  useAnalyticsPostingTimes,
  useAnalyticsAudience,
} from "@/hooks/analytics";
import { InsightCard } from "@/components/analytics/InsightCard";
import { AudienceProfile } from "@/components/analytics/AudienceProfile";
import { PostingTimes } from "@/components/analytics/PostingTimes";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { Button } from "@/components/ui/Button";

interface InsightsClientProps {
  workspaceId: string;
}

export function InsightsClient({ workspaceId }: InsightsClientProps) {
  const [range, setRange] = useState<DateRange>("30d");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();

  const handleRangeChange = (newRange: DateRange, newFrom?: string, newTo?: string) => {
    setRange(newRange);
    setFrom(newFrom);
    setTo(newTo);
  };

  const { data: insights, isLoading: insightsLoading } = useAnalyticsInsights(workspaceId, range, from, to);
  const { data: postingTimes, isLoading: postingTimesLoading } = useAnalyticsPostingTimes(workspaceId, undefined, range, from, to);
  const { data: audience, isLoading: audienceLoading } = useAnalyticsAudience(workspaceId, undefined, range, from, to);

  const rangeLabel = range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "Custom range";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/analytics"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Smart Insights</h1>
              <p className="text-sm text-muted-foreground">AI-powered recommendations based on your link performance.</p>
            </div>
          </div>
        </div>
        <DateRangePicker value={range} onChange={handleRangeChange} />
      </div>

      {/* Loading state */}
      {insightsLoading && postingTimesLoading && audienceLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-4 w-24 rounded bg-muted mb-3" />
              <div className="h-3 w-full rounded bg-muted mb-2" />
              <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Actionable Insights Cards */}
      {insights?.insights && insights.insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-foreground">
              Key Findings ({rangeLabel})
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.insights.map((insight: any, i: number) => (
              <InsightCard key={i} {...insight} />
            ))}
          </div>
        </div>
      )}

      {!insightsLoading && (!insights?.insights || insights.insights.length === 0) && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-base font-semibold text-foreground">Not enough data yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Insights will appear once you have enough click data across your links. Keep sharing your links!
          </p>
        </div>
      )}

      {/* Audience + Posting Times */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AudienceProfile data={audience} isLoading={audienceLoading} />
        <PostingTimes data={postingTimes} isLoading={postingTimesLoading} />
      </div>
    </div>
  );
}

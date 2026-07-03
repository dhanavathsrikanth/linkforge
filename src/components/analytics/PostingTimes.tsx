"use client";

import { Clock, Sun, SunDim, Moon, Sunrise } from "lucide-react";

interface HourBucket {
  hour: number;
  label: string;
  clicks: number;
  percentage: number;
}

interface PostingTimesProps {
  data: {
    buckets: HourBucket[];
    peak: { hour: number; label: string; clicks: number };
    recommendation: string;
  } | undefined;
  isLoading?: boolean;
}

function partIcon(hour: number) {
  if (hour >= 6 && hour <= 11) return Sun;
  if (hour >= 12 && hour <= 17) return SunDim;
  if (hour >= 18 && hour <= 23) return Moon;
  return Sunrise;
}

export function PostingTimes({ data, isLoading }: PostingTimesProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border-primary bg-bg-primary p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-bg-tertiary" />
          <div className="h-20 rounded bg-bg-secondary" />
          <div className="h-4 w-48 rounded bg-bg-tertiary" />
        </div>
      </div>
    );
  }

  if (!data || data.buckets.every((b) => b.clicks === 0)) {
    return (
      <div className="rounded-xl border border-border-primary bg-bg-primary p-5">
        <p className="text-sm text-text-tertiary text-center py-4">No click data available yet.</p>
      </div>
    );
  }

  const maxClicks = Math.max(...data.buckets.map((b) => b.clicks));
  const PeakedIcon = partIcon(data.peak.hour);

  return (
    <div className="rounded-xl border border-border-primary bg-bg-primary p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-text-brand-tertiary" />
        <h3 className="text-sm font-semibold text-text-primary">Best Posting Times</h3>
      </div>

      {/* Hour heatmap */}
      <div className="grid grid-cols-24 gap-0.5 mb-4">
        {data.buckets.map((bucket) => {
          const intensity = maxClicks > 0 ? (bucket.clicks / maxClicks) * 100 : 0;
          const isPeak = bucket.hour === data.peak.hour;
          return (
            <div key={bucket.hour} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-sm transition-all ${isPeak ? "ring-1 ring-border-brand" : ""}`}
                style={{
                  height: `${Math.max(4, intensity * 0.6)}px`,
                  backgroundColor: intensity > 0
                    ? `hsl(260, ${40 + intensity * 0.4}%, ${75 - intensity * 0.4}%)`
                    : "var(--color-bg-tertiary)",
                }}
                title={`${bucket.label}: ${bucket.clicks} clicks (${bucket.percentage}%)`}
              />
              <span className={`text-[8px] leading-tight ${isPeak ? "font-bold text-text-brand-tertiary" : "text-text-quaternary"}`}>
                {bucket.hour % 6 === 0 ? bucket.label.split(" ")[0] : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Peak indicator */}
      <div className="flex items-center gap-2 rounded-lg bg-bg-brand-primary p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-brand-secondary text-text-brand-tertiary">
          <PeakedIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-text-primary">Peak at {data.peak.label}</p>
          <p className="text-xs text-text-brand-tertiary">{data.peak.clicks} clicks in this hour</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-secondary leading-relaxed">{data.recommendation}</p>
    </div>
  );
}

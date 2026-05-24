"use client";

import { BarChart2 } from "lucide-react";

type Props = {
  variantCount: number;
  totalClicks: number;
  onClick?: () => void;
};

export function ABTestBadge({ variantCount, totalClicks, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`A/B test running — ${variantCount} variants — ${totalClicks} total clicks`}
      className="group relative inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-600 border border-violet-200 hover:bg-violet-100 transition-colors"
    >
      <BarChart2 className="h-3 w-3" />
      A/B
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg z-10">
        {variantCount} variants — {totalClicks} clicks
      </span>
    </button>
  );
}

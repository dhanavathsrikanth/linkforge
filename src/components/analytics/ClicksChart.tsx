"use client";

import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ClicksChartProps {
  data: {
    date: string;
    clicks: number;
    uniqueClicks?: number;
  }[];
  isLoading?: boolean;
}

export function ClicksChart({ data, isLoading }: ClicksChartProps) {
  const [view, setView] = useState<"clicks" | "unique">("clicks");

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-slate-500">No click data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setView("clicks")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
              view === "clicks"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Total Clicks
          </button>
          <button
            onClick={() => setView("unique")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
              view === "unique"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unique
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#a1a1aa' }} 
            minTickGap={30}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#a1a1aa' }} 
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '8px', color: '#fff' }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: view === 'clicks' ? '#3b82f6' : '#8b5cf6' }}
            formatter={(value) => [Number(value).toLocaleString(), view === "clicks" ? "Clicks" : "Unique Visitors"]}
          />
          <Area
            type="monotone"
            dataKey={view === "clicks" ? "clicks" : "uniqueClicks"}
            stroke={view === "clicks" ? "#3b82f6" : "#8b5cf6"}
            strokeWidth={2}
            fillOpacity={1}
            fill={view === "clicks" ? "url(#colorClicks)" : "url(#colorUnique)"}
            activeDot={{ r: 6, fill: view === "clicks" ? '#3b82f6' : '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

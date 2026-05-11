"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface ClicksChartProps {
  data: {
    date: string;
    clicks: number;
  }[];
}

export function ClicksChart({ data }: ClicksChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
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
          itemStyle={{ color: '#8b5cf6' }}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="#8b5cf6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorClicks)"
          activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

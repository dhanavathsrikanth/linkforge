"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface DonutChartProps {
  data: {
    label: string;
    clicks: number;
    percentage: number;
  }[];
  isLoading?: boolean;
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function DonutChart({ data, isLoading }: DonutChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-32 w-32 animate-pulse rounded-full border-4 border-slate-200" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-slate-500">
        No data available
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.clicks,
    percentage: item.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            borderColor: "#ffffff10",
            borderRadius: "8px",
            color: "#fff",
          }}
          itemStyle={{ color: "#fff" }}
          formatter={(value, name, props) => [
            `${Number(value).toLocaleString()} clicks (${props.payload.percentage}%)`,
            name,
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
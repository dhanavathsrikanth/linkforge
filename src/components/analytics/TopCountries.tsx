"use client";

interface TopCountriesProps {
  data: {
    label: string;
    clicks: number;
    percentage: number;
  }[];
  isLoading?: boolean;
}

export function TopCountries({ data, isLoading }: TopCountriesProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-8 animate-pulse rounded bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-2 w-full animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500">No data available</div>;
  }

  const maxClicks = Math.max(...data.map((d) => d.clicks));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-lg">{item.label.split(" ")[0]}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">
                {item.label.split(" ").slice(1).join(" ") || item.label}
              </span>
              <span className="text-sm text-slate-500">{item.clicks.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${(item.clicks / maxClicks) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-500 w-12 text-right">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
}
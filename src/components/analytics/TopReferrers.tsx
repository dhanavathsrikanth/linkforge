"use client";

interface TopReferrersProps {
  data: {
    label: string;
    clicks: number;
    percentage: number;
  }[];
  isLoading?: boolean;
}

function getFaviconUrl(domain: string): string {
  if (domain === "Direct" || !domain) {
    return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`);
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export function TopReferrers({ data, isLoading }: TopReferrersProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 animate-pulse rounded bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
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

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <img
              src={getFaviconUrl(item.label)}
              alt=""
              className="h-4 w-4"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`);
              }}
            />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-900">
              {item.label}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-900">{item.clicks.toLocaleString()}</span>
            <span className="ml-2 text-sm text-slate-500">({item.percentage}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}
"use client";

import { Sparkline } from "./Sparkline";

interface TopLinksTableProps {
  data: {
    id: string;
    title: string;
    slug: string;
    domain: string;
    url: string;
    clicks: number;
    uniqueClicks: number;
    ctr: number;
    createdAt: string;
    trend: number[];
  }[];
  isLoading?: boolean;
  onRowClick?: (linkId: string) => void;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>`);
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TopLinksTable({ data, isLoading, onRowClick }: TopLinksTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500">
        No links with clicks yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <th className="pb-3 pr-4">Link</th>
            <th className="pb-3 pr-4">Clicks</th>
            <th className="pb-3 pr-4">Unique</th>
            <th className="pb-3 pr-4">CTR</th>
            <th className="pb-3 pr-4">Created</th>
            <th className="pb-3">7-day trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((link) => (
            <tr
              key={link.id}
              onClick={() => onRowClick?.(link.id)}
              className="cursor-pointer transition-colors hover:bg-slate-50"
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <img
                      src={getFaviconUrl(link.url)}
                      alt=""
                      className="h-5 w-5 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>`);
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{link.title}</p>
                    <p className="text-sm text-slate-500">{link.domain}/{link.slug}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className="font-medium text-slate-900">{link.clicks.toLocaleString()}</span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-slate-600">{link.uniqueClicks.toLocaleString()}</span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-slate-600">{link.ctr}%</span>
              </td>
              <td className="py-3 pr-4">
                <span className="text-sm text-slate-500">{formatDate(link.createdAt)}</span>
              </td>
              <td className="py-3">
                <Sparkline data={link.trend} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
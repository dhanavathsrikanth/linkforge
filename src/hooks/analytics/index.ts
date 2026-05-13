import { useQuery } from "@tanstack/react-query";

export type DateRange = "7d" | "30d" | "90d" | "custom";

interface OverviewData {
  totalClicks: number;
  uniqueClicks: number;
  clicksToday: number;
  clicksGrowth: number;
  topLink: {
    id: string;
    slug: string;
    clicks: number;
  } | null;
  averageCTR: number;
  topCountry: string;
  topDevice: string;
}

interface TimeSeriesData {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

interface BreakdownData {
  label: string;
  clicks: number;
  percentage: number;
}

interface TopLinkData {
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
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });
  return searchParams.toString();
}

export function useAnalyticsOverview(
  workspaceId: string | undefined,
  range: DateRange,
  from?: string,
  to?: string
) {
  return useQuery<OverviewData>({
    queryKey: ["analytics", "overview", workspaceId, range, from, to],
    queryFn: async () => {
      if (!workspaceId) return null;
      const queryString = buildQueryString({
        workspaceId,
        range,
        from,
        to,
      });
      const res = await fetch(`/api/v1/analytics/overview?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}

export function useAnalyticsTimeSeries(
  workspaceId: string | undefined,
  linkId: string | undefined,
  range: DateRange,
  groupBy: "day" | "hour" = "day",
  from?: string,
  to?: string
) {
  return useQuery<TimeSeriesData[]>({
    queryKey: ["analytics", "timeseries", workspaceId, linkId, range, groupBy, from, to],
    queryFn: async () => {
      if (!workspaceId) return [];
      const queryString = buildQueryString({
        workspaceId,
        linkId,
        range,
        groupBy,
        from,
        to,
      });
      const res = await fetch(`/api/v1/analytics/timeseries?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch timeseries");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}

export function useAnalyticsBreakdown(
  workspaceId: string | undefined,
  linkId: string | undefined,
  range: DateRange,
  dimension: "country" | "device" | "browser" | "os" | "referrer",
  from?: string,
  to?: string
) {
  return useQuery<BreakdownData[]>({
    queryKey: ["analytics", "breakdown", workspaceId, linkId, range, dimension, from, to],
    queryFn: async () => {
      if (!workspaceId) return [];
      const queryString = buildQueryString({
        workspaceId,
        linkId,
        range,
        dimension,
        from,
        to,
      });
      const res = await fetch(`/api/v1/analytics/breakdown?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch breakdown");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}

export function useAnalyticsTopLinks(
  workspaceId: string | undefined,
  range: DateRange,
  limit: number = 10,
  from?: string,
  to?: string
) {
  return useQuery<TopLinkData[]>({
    queryKey: ["analytics", "top-links", workspaceId, range, limit, from, to],
    queryFn: async () => {
      if (!workspaceId) return [];
      const queryString = buildQueryString({
        workspaceId,
        range,
        limit: limit.toString(),
        from,
        to,
      });
      const res = await fetch(`/api/v1/analytics/top-links?${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch top links");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}
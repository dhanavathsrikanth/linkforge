"use client";

import { Suspense, useState } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LiveAnalyticsFeed } from "@/components/durable-objects/LiveAnalyticsFeed";
import { LiveABTestResults } from "@/components/durable-objects/LiveABTestResults";
import { QRScanStream } from "@/components/durable-objects/QRScanStream";
import { KPICard } from "@/components/analytics/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Globe, MousePointerClick, ChevronDown, Link2 } from "lucide-react";

type LinkOption = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  totalClicks: number;
};

type OverviewData = {
  totalClicks: number;
  uniqueClicks: number;
  clicksToday: number;
  clicksGrowth: number;
  deepLinkClicks: number;
  topLink: { id: string; slug: string; clicks: number } | null;
  averageCTR: number;
  topCountry: string;
  topCountryCount: number;
  topDevice: string;
  topDeviceCount: number;
  qrScans: number;
  qrScansToday: number;
  qrScanGrowth: number;
};

function useAnalyticsOverview(workspaceId: string | undefined, linkId?: string) {
  return useQuery<OverviewData>({
    queryKey: ["analytics", "overview", workspaceId, linkId],
    queryFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const params = new URLSearchParams({ workspaceId, range: "30d" });
      if (linkId) params.set("linkId", linkId);
      const res = await fetch(`/api/v1/analytics/overview?${params}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
    enabled: !!workspaceId,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
}

function LinkSelector({
  links,
  selectedId,
  onSelect,
  isLoading,
}: {
  links: LinkOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const selected = links.find((l) => l.id === selectedId);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">
          {isLoading ? (
            <span className="text-muted-foreground">Loading links...</span>
          ) : selected ? (
            <>{selected.title || selected.slug} <span className="text-muted-foreground">· {selected.destination}</span></>
          ) : (
            <span className="text-muted-foreground">All links (workspace-wide)</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {selected?.totalClicks ?? 0} clicks
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          <button
            type="button"
            onClick={() => { onSelect(""); setOpen(false); }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
              !selectedId ? "bg-primary/5 font-medium" : ""
            )}
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>All links (workspace-wide)</span>
          </button>
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => { onSelect(link.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                selectedId === link.id ? "bg-primary/5 font-medium" : ""
              )}
            >
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-mono text-xs">{link.slug}</span>
                {link.title && <span className="ml-1.5 text-muted-foreground">· {link.title}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{link.totalClicks}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function LiveAnalyticsContent() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlLinkId = searchParams.get("linkId") || "";

  const [selectedLinkId, setSelectedLinkId] = useState(urlLinkId);

  const wsId = workspace?.id;

  const { data: linksData, isLoading: linksLoading } = useQuery<LinkOption[]>({
    queryKey: ["links", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const res = await fetch(`/api/links?workspaceId=${wsId}&limit=100`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.links || json.data || []).map((l: any) => ({
        id: l.id,
        slug: l.slug,
        destination: l.destination,
        title: l.title,
        totalClicks: l.totalClicks ?? 0,
      }));
    },
    enabled: !!wsId,
    refetchInterval: 30000,
  });

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(wsId, selectedLinkId || undefined);

  const links = linksData || [];

  function handleLinkSelect(id: string) {
    setSelectedLinkId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("linkId", id);
    } else {
      params.delete("linkId");
    }
    router.replace(`/dashboard/analytics/live?${params}`, { scroll: false });
  }

  if (wsLoading) {
    return <div className="flex min-h-[400px] items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  if (!wsId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">No workspace found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a workspace to view live analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Real-time click data powered by Cloudflare Durable Objects WebSockets
        </p>
      </div>

      {/* Link Selector */}
      <Card>
        <CardContent className="pt-4">
          <LinkSelector
            links={links}
            selectedId={selectedLinkId}
            onSelect={handleLinkSelect}
            isLoading={linksLoading}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedLinkId
              ? "Showing per-link analytics with live WebSocket data"
              : "Showing workspace-wide aggregate analytics. Select a link above for per-link live data."}
          </p>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Clicks (30d)"
          value={overview?.totalClicks ?? 0}
          growth={overview?.clicksGrowth}
          isLoading={overviewLoading}
        />
        <KPICard
          label="Unique Visitors"
          value={overview?.uniqueClicks ?? 0}
          isLoading={overviewLoading}
        />
        <KPICard
          label="Today"
          value={overview?.clicksToday ?? 0}
          subValue={selectedLinkId ? "for selected link" : "workspace-wide"}
          isLoading={overviewLoading}
        />
        <KPICard
          label="QR Scans (30d)"
          value={overview?.qrScans ?? 0}
          growth={overview?.qrScanGrowth}
          isLoading={overviewLoading}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KPICard
          label="Top Device"
          value={overview?.topDeviceCount ?? 0}
          subValue={overview?.topDevice || "—"}
          compact
          isLoading={overviewLoading}
        />
        <KPICard
          label="Top Country"
          value={overview?.topCountryCount ?? 0}
          subValue={overview?.topCountry || "—"}
          compact
          isLoading={overviewLoading}
        />
        <KPICard
          label="Deep Link Clicks"
          value={overview?.deepLinkClicks ?? 0}
          compact
          isLoading={overviewLoading}
        />
      </div>

      {/* Live Feeds */}
      <div className="grid gap-4 md:grid-cols-2">
        {selectedLinkId ? (
          <>
            <LiveAnalyticsFeed linkId={selectedLinkId} />
            <LiveABTestResults linkId={selectedLinkId} />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <MousePointerClick className="h-4 w-4 text-primary" />
                  Live Activity
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    ALL LINKS
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Link2 className="mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">Select a link above</p>
                  <p className="mt-1 text-xs">to view its live click feed via WebSocket</p>
                </div>
              </CardContent>
            </Card>
            <QRScanStream qrId={wsId} />
          </>
        )}
      </div>

      {selectedLinkId && (
        <div>
          <QRScanStream qrId={selectedLinkId} />
        </div>
      )}
    </div>
  );
}

export default function LiveAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border"><div className="text-sm text-muted-foreground">Loading...</div></div>}>
      <LiveAnalyticsContent />
    </Suspense>
  );
}

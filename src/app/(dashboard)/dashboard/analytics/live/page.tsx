"use client";

import { Suspense } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useSearchParams } from "next/navigation";
import { LiveAnalyticsFeed } from "@/components/durable-objects/LiveAnalyticsFeed";
import { LiveABTestResults } from "@/components/durable-objects/LiveABTestResults";
import { QRScanStream } from "@/components/durable-objects/QRScanStream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity, FlaskConical, QrCode } from "lucide-react";

function LiveAnalyticsContent() {
  const { workspace, isLoading } = useWorkspace();
  const searchParams = useSearchParams();
  const linkId = searchParams.get("linkId") || "";

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!workspace?.id) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Real-time click data streamed via Durable Objects WebSockets
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">
                Connection Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                WebSocket Active
              </Badge>
              <span className="text-xs text-muted-foreground">
                Durable Object at edge
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              All live data flows through Cloudflare Durable Objects with SQLite-backed persistence. No polling needed — events push directly to connected clients.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">
                Architecture
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Browser ← WebSocket → AnalyticsWebSocket DO (per link)</p>
              <p>Browser ← WebSocket → AbTestStream DO (per A/B test)</p>
              <p>Browser ← WebSocket → QrStream DO (per QR code)</p>
              <p>Click events → Queue → Analytics Engine + WebSocket push</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {linkId ? (
        <div className="grid gap-4 md:grid-cols-2">
          <LiveAnalyticsFeed linkId={linkId} />
          <LiveABTestResults linkId={linkId} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Select a link to view its live analytics feed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Append <code className="rounded bg-muted px-1.5 py-0.5">?linkId=YOUR_LINK_ID</code> to the URL
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <QRScanStream qrId={workspace.id} />
        <LiveABTestResults linkId={linkId || "demo"} />
      </div>
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

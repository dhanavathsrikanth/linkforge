"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  BarChart3, MousePointerClick, DollarSign, Route, CalendarDays,
  TrendingUp, Info, Search, ExternalLink, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/Dialog";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/Card";
import type {
  AttributionModel, AttributionReport, LinkCredit, CustomerPath,
} from "@/types/attribution";

const MODELS: { id: AttributionModel; label: string; desc: string; diagram: string; when: string }[] = [
  {
    id: "first_touch",
    label: "First Touch",
    desc: "Give 100% credit to the link that brought the customer in.",
    diagram: "100% ──► First Link",
    when: "Best for top-of-funnel awareness measurement.",
  },
  {
    id: "last_touch",
    label: "Last Touch",
    desc: "Give 100% credit to the final link before conversion.",
    diagram: "100% ──► Last Link",
    when: "Best for bottom-of-funnel and direct response.",
  },
  {
    id: "linear",
    label: "Linear",
    desc: "Divide credit equally across all touchpoints.",
    diagram: "33% │ 33% │ 33%",
    when: "Best for campaigns with consistent messaging.",
  },
  {
    id: "time_decay",
    label: "Time Decay",
    desc: "Give more credit to recent touchpoints.",
    diagram: "10% │ 25% │ 65%",
    when: "Best for short sales cycles where recency matters.",
  },
];

const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

function AttributionLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
      <div className="text-sm text-muted-foreground">Loading attribution data...</div>
    </div>
  );
}

function AttributionEmpty({ model }: { model: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="text-base font-medium text-foreground mb-1">No attribution data yet</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {model === "first_touch"
          ? "As customers click your links and convert, multi-touch attribution data will appear here."
          : "Switch to First Touch to see initial data, then explore other models."}
      </p>
    </div>
  );
}

export default function AttributionPage() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const [model, setModel] = useState<AttributionModel>("first_touch");
  const [range, setRange] = useState("30d");
  const [sortBy, setSortBy] = useState<"credit" | "creditValue" | "directConversions">("credit");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  const [compareLink, setCompareLink] = useState<LinkCredit | null>(null);

  const { data: report, isLoading } = useQuery<AttributionReport>({
    queryKey: ["attribution", workspace?.id, model, range],
    queryFn: async () => {
      if (!workspace?.id) return null;
      const res = await fetch(
        `/api/analytics/attribution?model=${model}&range=${range}&workspaceId=${workspace.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch attribution report");
      return res.json();
    },
    enabled: !!workspace?.id,
    // Attribution reports are expensive — recompute every 60s so the page
    // stays reasonably current without thrashing the DB on every keystroke.
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const { data: journeyData } = useQuery<any>({
    queryKey: ["attribution-journey", workspace?.id, searchEmail],
    queryFn: async () => {
      if (!workspace?.id || !searchEmail) return null;
      const res = await fetch(
        `/api/analytics/attribution?workspaceId=${workspace.id}&search=${encodeURIComponent(searchEmail)}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspace?.id && searchEmail.length > 2,
  });

  if (wsLoading) return <AttributionLoading />;
  if (!workspace?.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">No workspace found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a workspace to view attribution analytics.</p>
        </div>
      </div>
    );
  }

  const sortedCredits = report?.linkCredits
    ? [...report.linkCredits].sort((a, b) => {
        switch (sortBy) {
          case "creditValue": return b.creditValue - a.creditValue;
          case "directConversions": return b.directConversions - a.directConversions;
          default: return b.credit - a.credit;
        }
      })
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Multi-Touch Attribution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Understand how each link contributes to conversions across the customer journey
          </p>
        </div>
      </div>

      {/* SECTION 1 — Model Selector */}
      <section>
        <h2 className="text-sm font-medium text-foreground mb-3">Attribution Model</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={cn(
                "text-left rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                model === m.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                  model === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {m.label[0]}
                </div>
                <span className={cn(
                  "font-semibold text-sm",
                  model === m.id ? "text-primary" : "text-foreground"
                )}>
                  {m.label}
                </span>
              </div>
              <div className="text-xs font-mono text-muted-foreground mb-2 bg-muted/50 px-2 py-1 rounded">
                {m.diagram}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.when}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              variant={range === r.id ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? <AttributionLoading /> : !report || report.totalConversions === 0 ? (
        <AttributionEmpty model={model} />
      ) : (
        <>
          {/* SECTION 2 — Summary Row */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{report.totalConversions}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all journeys</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Attributed</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${report.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Using {model.replace("_", " ")} model</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Touchpoints</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{report.avgTouchpointsToConvert}</div>
                <p className="text-xs text-muted-foreground mt-1">Per conversion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Days to Convert</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{report.avgDaysToConvert}</div>
                <p className="text-xs text-muted-foreground mt-1">From first touch</p>
              </CardContent>
            </Card>
          </section>

          {/* SECTION 3 — Link Attribution Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Link Attribution</h2>
              <div className="flex gap-2">
                {(["credit", "creditValue", "directConversions"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={sortBy === s ? "secondary" : "ghost"}
                    size="xs"
                    onClick={() => setSortBy(s)}
                  >
                    {s === "credit" ? "Credit %" : s === "creditValue" ? "Revenue" : "Direct"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Link</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Credit %</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Revenue</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Direct</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Assisted</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Impact</th>
                    <th className="text-right px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCredits.map((lc) => {
                    const totalImpact = lc.directConversions + lc.assistedConversions;
                    return (
                      <tr key={lc.linkId} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="truncate max-w-[200px]">
                              <div className="font-medium text-foreground truncate">/{lc.slug}</div>
                              <div className="text-xs text-muted-foreground truncate">{lc.destination}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                          {lc.credit.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                          ${lc.creditValue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">{lc.directConversions}</td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">{lc.assistedConversions}</td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">{totalImpact}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon-xs" onClick={() => setCompareLink(lc)}>
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 4 — Customer Paths */}
          {report.topPath.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Top Customer Paths</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Path</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Journeys</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Conversions</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topPath.map((path, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {path.touchpoints.map((slug, j) => (
                              <span key={j} className="inline-flex items-center gap-1">
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/{slug}</span>
                                {j < path.touchpoints.length - 1 && (
                                  <span className="text-muted-foreground text-xs">→</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{path.count}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{path.conversions}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                          ${path.totalValue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SECTION 5 — Journey Timeline Search */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Journey Timeline</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Search by customer email or session ID to see the full story of a single customer journey.
            </p>
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by email or session ID..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>

            {journeyData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer Journey</CardTitle>
                  <CardDescription>
                    {journeyData.customerEmail && `Email: ${journeyData.customerEmail}`}
                    {journeyData.customerId && ` · ID: ${journeyData.customerId}`}
                    {journeyData.sessionId && ` · Session: ${journeyData.sessionId}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {journeyData.touchpoints?.length > 0 ? (
                    <div className="relative pl-6 ml-3 border-l-2 border-border space-y-6">
                      {journeyData.touchpoints.map((tp: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-foreground">/{tp.slug}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(tp.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">{tp.destination}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {tp.utmSource && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  source: {tp.utmSource}
                                </span>
                              )}
                              {tp.utmMedium && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  medium: {tp.utmMedium}
                                </span>
                              )}
                              {tp.device && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {tp.device}
                                </span>
                              )}
                              {tp.country && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {tp.country}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {journeyData.converted && (
                        <div className="relative">
                          <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-green-600">
                                Converted — {journeyData.conversionEvent}
                              </span>
                              <span className="text-sm font-mono text-green-600">
                                ${parseFloat(journeyData.conversionValue || "0").toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {journeyData.conversionAt
                                ? new Date(journeyData.conversionAt).toLocaleString()
                                : ""}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No touchpoints found.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}

      {/* Model Comparison Modal */}
      <Dialog open={!!compareLink} onOpenChange={(open) => !open && setCompareLink(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Model Comparison — /{compareLink?.slug}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {compareLink && (
              <div className="text-sm text-muted-foreground mb-4">
                {compareLink.destination}
              </div>
            )}
            {MODELS.map((m) => {
              return (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className={cn(
                      "font-medium text-sm",
                      m.id === model ? "text-primary" : "text-foreground"
                    )}>
                      {m.label}
                      {m.id === model && " (active)"}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-medium text-foreground">
                      {compareLink?.credit.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-2">
              Switch the model selector above to see how credit distribution changes across all models.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, Eye, Users, MousePointerClick, Heart, Inbox,
  Globe, Smartphone, Monitor, Tablet, ExternalLink, RefreshCw,
  Download, Mail, Copy, Check,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type {
  BioAnalyticsResponse, BlockDetail, ReactionData, WaitlistSubmission,
} from "@/app/api/bio/analytics/[galleryId]/route";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4", className)}>
      {children}
    </div>
  );
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, color = "text-foreground", loading,
}: {
  icon: React.ElementType; label: string; value: number; color?: string; loading: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      {loading ? <Skeleton className="h-8 w-20" /> : (
        <span className={cn("text-2xl font-bold tabular-nums", color)}>
          {value.toLocaleString()}
        </span>
      )}
    </Card>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = new Date(label);
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{formatted}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Date range toggle ────────────────────────────────────────────────────────

function DateToggle({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg">
      {[7, 30].map((d) => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
            value === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          {d}d
        </button>
      ))}
    </div>
  );
}

// ─── Page views chart ─────────────────────────────────────────────────────────

function PageViewsChart({ data, loading, days }: {
  data: { date: string; total_views: number; unique_visitors: number }[];
  loading: boolean; days: number;
}) {
  const max = Math.max(...data.map((d) => d.total_views), 1);
  return (
    <Card>
      <p className="text-sm font-semibold text-foreground mb-4">Page views over time</p>
      {loading ? <Skeleton className="h-48 w-full" /> : max === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickLine={false} axisLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              interval={days === 7 ? 1 : 6} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="total_views" name="Views"
              stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#vGrad)" dot={false} />
            <Area type="monotone" dataKey="unique_visitors" name="Unique"
              stroke="#10b981" strokeWidth={2} fill="url(#uGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-4 mt-2">
        {[["hsl(var(--primary))", "Views"], ["#10b981", "Unique visitors"]].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Waitlist submissions table ───────────────────────────────────────────────

function WaitlistPanel({ block, loading }: { block: BlockDetail; loading: boolean }) {
  const [copied, setCopied] = useState(false);
  const submissions = block.waitlistSubmissions ?? [];

  function copyAll() {
    if (!submissions.length) return;
    navigator.clipboard.writeText(submissions.map((s) => s.email).join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCsv() {
    window.open(`/api/bio/blocks/${block.blockId}/submissions?format=csv`, "_blank");
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {block.blockName ?? "Waitlist"} — Email Signups
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {submissions.length} unique email{submissions.length !== 1 ? "s" : ""} collected
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyAll} disabled={!submissions.length}
            title="Copy all emails"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copy
          </button>
          <button onClick={downloadCsv} disabled={!submissions.length}
            title="Export CSV"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
        </div>
      </div>
      {loading ? <Skeleton className="h-32 w-full" /> : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No signups yet in this period</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Country</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((s) => (
                <tr key={s.email} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground">{s.email}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground uppercase">{s.country ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground capitalize">{s.device ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Reaction analytics panel ─────────────────────────────────────────────────

function ReactionPanel({ data, loading, days }: { data: ReactionData; loading: boolean; days: number }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 text-pink-500" />
        <p className="text-sm font-semibold text-foreground">
          Reactions — {data.total.toLocaleString()} total
        </p>
      </div>
      {loading ? <Skeleton className="h-32 w-full" /> : data.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Heart className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No reactions yet in this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data.daily} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickLine={false} axisLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              interval={days === 7 ? 1 : 6} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Reactions" fill="#f472b6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// ─── Top blocks bar chart ─────────────────────────────────────────────────────

function TopBlocksPanel({ blocks, loading }: { blocks: BlockDetail[]; loading: boolean }) {
  if (!loading && blocks.length === 0) return null;
  const maxInteractions = Math.max(...blocks.map((b) => b.clicks + b.submissions + b.reactions), 1);
  return (
    <Card>
      <p className="text-sm font-semibold text-foreground mb-3">Block interactions</p>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : (
        <div className="divide-y divide-border">
          {blocks.sort((a, b) => (b.clicks + b.submissions + b.reactions) - (a.clicks + a.submissions + a.reactions)).map((b) => {
            const total = b.clicks + b.submissions + b.reactions;
            const pct = Math.round((total / maxInteractions) * 100);
            const label = (b.blockName ?? b.blockType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
            return (
              <div key={b.blockId} className="flex items-center gap-3 py-2">
                <div className="flex-1 relative h-7">
                  <div className="absolute inset-y-0 left-0 bg-primary/10 rounded transition-all" style={{ width: `${pct}%`, minWidth: "4px" }} />
                  <div className="absolute inset-y-0 left-2 flex items-center">
                    <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                  {b.clicks > 0 && <span className="flex items-center gap-0.5"><MousePointerClick className="w-3 h-3" />{b.clicks.toLocaleString()}</span>}
                  {b.submissions > 0 && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{b.submissions.toLocaleString()}</span>}
                  {b.reactions > 0 && <span className="flex items-center gap-0.5"><Heart className="w-3 h-3 text-pink-400" />{b.reactions.toLocaleString()}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Audience panels ──────────────────────────────────────────────────────────

function LocationsPanel({ locations, totalViews, loading }: {
  locations: { location: string; hits: number }[]; totalViews: number; loading: boolean;
}) {
  if (!loading && locations.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Top locations</p>
      </div>
      {loading ? <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div> : (
        <div className="divide-y divide-border">
          {locations.map((loc) => {
            const pct = totalViews > 0 ? Math.round((loc.hits / totalViews) * 100) : 0;
            return (
              <div key={loc.location} className="flex items-center gap-2 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {loc.location !== "Unknown" && (
                  <img src={`https://flag.vercel.app/s/${loc.location}.svg`} alt={loc.location}
                    width={18} height={13} className="rounded-sm shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                {loc.location === "Unknown" && <Globe className="w-4 h-3.5 shrink-0 text-muted-foreground" />}
                <div className="flex-1 relative h-6">
                  <div className="absolute inset-y-0 left-0 bg-primary/10 rounded" style={{ width: `${pct}%`, minWidth: "4px" }} />
                  <div className="absolute inset-y-0 left-2 flex items-center">
                    <span className="text-xs font-medium text-foreground">{loc.location}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function DevicesPanel({ devices, loading }: {
  devices: { device: string; hits: number }[]; loading: boolean;
}) {
  if (!loading && devices.length === 0) return null;
  const total = devices.reduce((s, d) => s + d.hits, 0);
  function DevIcon({ device }: { device: string }) {
    if (device === "mobile") return <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />;
    if (device === "tablet") return <Tablet className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Monitor className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  return (
    <Card>
      <p className="text-sm font-semibold text-foreground mb-3">Devices</p>
      {loading ? <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div> : (
        <div className="divide-y divide-border">
          {devices.map((dev) => {
            const pct = total > 0 ? Math.round((dev.hits / total) * 100) : 0;
            return (
              <div key={dev.device} className="flex items-center gap-2 py-2">
                <DevIcon device={dev.device} />
                <span className="text-xs text-foreground capitalize flex-1">{dev.device}</span>
                <span className="text-xs text-muted-foreground">{pct}% · {dev.hits.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ReferrersPanel({ referrers, loading }: {
  referrers: { referrer: string; hits: number }[]; loading: boolean;
}) {
  if (!loading && referrers.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Top referrers</p>
      </div>
      {loading ? <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div> : (
        <div className="divide-y divide-border">
          {referrers.map((ref) => (
            <div key={ref.referrer} className="flex items-center justify-between py-2">
              <span className="text-xs text-foreground truncate flex-1">{ref.referrer}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{ref.hits.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── BioAnalyticsPage (main export) ──────────────────────────────────────────

interface BioAnalyticsPageProps {
  galleryId: string;
  slug: string;
  displayName: string | null;
  isPublished: boolean;
}

export function BioAnalyticsPage({ galleryId, slug, displayName, isPublished }: BioAnalyticsPageProps) {
  const [data, setData] = useState<BioAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  async function fetchData(d: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bio/analytics/${galleryId}?days=${d}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as any)?.error?.code === "NOT_ENOUGH_DATA" ? "not_enough_data" : "failed");
        return;
      }
      setData(await res.json());
    } catch { setError("failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (isPublished) fetchData(days);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId, isPublished, days]);

  if (!isPublished) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Publish to see analytics</p>
        <p className="text-xs text-muted-foreground">Once your page is live, analytics will appear here.</p>
      </div>
    );
  }

  if (!loading && error === "not_enough_data") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Collecting data…</p>
        <p className="text-xs text-muted-foreground">We&apos;re still gathering data. Check back in a few days.</p>
      </div>
    );
  }

  const totals = data?.stats.totals;
  const chartData = data?.stats.data ?? [];
  const blockDetails = data?.blockDetails ?? [];
  const waitlistBlocks = blockDetails.filter((b) => b.blockType === "waitlist-email");
  const reactionBlocks = data?.reactionBlocks ?? [];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{displayName ?? "Untitled page"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analytics for <span className="font-mono">/p/{slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateToggle value={days} onChange={(d) => { setDays(d); fetchData(d); }} />
          <button type="button" onClick={() => fetchData(days)} disabled={loading}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50 cursor-pointer transition-colors">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={Eye} label="Page views" value={totals?.views ?? 0} loading={loading} />
        <KpiCard icon={Users} label="Unique visitors" value={totals?.uniqueVisitors ?? 0} loading={loading} />
        <KpiCard icon={MousePointerClick} label="Block clicks" value={totals?.clicks ?? 0} loading={loading} />
        <KpiCard icon={Inbox} label="Signups" value={totals?.submissions ?? 0} color="text-primary" loading={loading} />
        <KpiCard icon={Heart} label="Reactions" value={totals?.reactions ?? 0} color="text-pink-500" loading={loading} />
      </div>

      {/* ── Views chart ─────────────────────────────────────────────────── */}
      <PageViewsChart data={chartData} loading={loading} days={days} />

      {/* ── Waitlist signups ─────────────────────────────────────────────── */}
      {(loading || waitlistBlocks.length > 0) && (
        <div>
          <SectionTitle>Waitlist signups</SectionTitle>
          <div className="space-y-4">
            {loading ? <Card><Skeleton className="h-40 w-full" /></Card>
              : waitlistBlocks.map((b) => <WaitlistPanel key={b.blockId} block={b} loading={loading} />)}
          </div>
        </div>
      )}

      {/* ── Reactions ────────────────────────────────────────────────────── */}
      {(loading || reactionBlocks.length > 0) && (
        <div>
          <SectionTitle>Reactions</SectionTitle>
          <div className="space-y-4">
            {loading ? <Card><Skeleton className="h-40 w-full" /></Card>
              : reactionBlocks.map((b) => <ReactionPanel key={b.blockId} data={b} loading={loading} days={days} />)}
          </div>
        </div>
      )}

      {/* ── Block interactions ────────────────────────────────────────────── */}
      {(loading || blockDetails.length > 0) && (
        <div>
          <SectionTitle>Block interactions</SectionTitle>
          <TopBlocksPanel blocks={blockDetails} loading={loading} />
        </div>
      )}

      {/* ── Audience ─────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Audience</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LocationsPanel locations={data?.locations ?? []} totalViews={totals?.views ?? 0} loading={loading} />
          <DevicesPanel devices={data?.devices ?? []} loading={loading} />
          <ReferrersPanel referrers={data?.referrers ?? []} loading={loading} />
        </div>
      </div>
    </div>
  );
}

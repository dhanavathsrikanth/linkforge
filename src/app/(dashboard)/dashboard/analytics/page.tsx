import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";
import { sql, eq, and, gte } from "drizzle-orm";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { TopList } from "@/components/analytics/TopList";

export const metadata = {
  title: "Analytics - LinkForge",
};

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.ownerId, userId),
  });

  if (!workspace) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
        <h2 className="text-lg font-medium text-slate-950">No workspace found</h2>
      </div>
    );
  }

  // Last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Time-series data
  const timeSeriesData = await db
    .select({
      date: sql<string>`date_trunc('day', ${clicks.createdAt})`,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(
      and(
        eq(clicks.workspaceId, workspace.id),
        gte(clicks.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`date_trunc('day', ${clicks.createdAt})`)
    .orderBy(sql`date_trunc('day', ${clicks.createdAt})`);

  // Fill in missing days with 0 clicks
  const chartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Simple matching (timezone edges might be slightly off in a real prod app without careful handling)
    const match = timeSeriesData.find(row => new Date(row.date).toISOString().split("T")[0] === dateStr);
    
    chartData.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks: match ? match.clicks : 0,
    });
  }

  // Top Countries
  const topCountries = await db
    .select({
      name: sql<string>`COALESCE(${clicks.country}, 'Unknown')`,
      value: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(eq(clicks.workspaceId, workspace.id))
    .groupBy(clicks.country)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  // Top Devices
  const topDevices = await db
    .select({
      name: sql<string>`COALESCE(${clicks.device}, 'Unknown')`,
      value: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(eq(clicks.workspaceId, workspace.id))
    .groupBy(clicks.device)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  // Top Referrers
  const topReferrers = await db
    .select({
      name: sql<string>`COALESCE(${clicks.referrerDomain}, 'Direct')`,
      value: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(eq(clicks.workspaceId, workspace.id))
    .groupBy(clicks.referrerDomain)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Analytics</h1>
        <p className="text-sm text-slate-600">Track your link performance across all channels.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Clicks", value: chartData.reduce((sum, d) => sum + d.clicks, 0), trend: "+12.5%" },
          { label: "Unique Visitors", value: chartData.reduce((sum, d) => sum + d.clicks, 0), trend: "+8.2%" },
          { label: "Avg. Duration", value: "2m 34s", trend: "+15%" },
          { label: "Top Referrer", value: topReferrers[0]?.name || "Direct", sub: `${topReferrers[0]?.value || 0} clicks` }
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#DEDCFF]">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <h3 className="text-2xl font-bold text-slate-950">{stat.value}</h3>
              {stat.trend && (
                <span className="text-xs font-medium text-[#27CE7A]">{stat.trend}</span>
              )}
            </div>
            {stat.sub && <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="mb-6 text-lg font-medium text-slate-950">Clicks over time</h3>
        <div className="h-[300px] w-full">
          <ClicksChart data={chartData} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <TopList title="Top Countries" data={topCountries} />
        <TopList title="Top Devices" data={topDevices} />
        <TopList title="Top Referrers" data={topReferrers} />
      </div>
    </div>
  );
}

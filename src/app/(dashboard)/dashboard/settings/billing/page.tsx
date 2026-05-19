import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, subscriptions, billingEvents, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUsageSummary } from "@/lib/billing/usage";
import { PLANS, PlanKey } from "@/lib/billing/plans";
import { UsageMeters } from "@/components/billing/UsageMeters";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId)
  });
  if (!dbUser) redirect("/login");

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, dbUser.id)
  });
  if (!workspace) redirect("/dashboard");

  const summary = await getUsageSummary(workspace.id);
  
  const formattedSummary = {
    linksPerMonth: {
      current: summary.current.linksPerMonth ?? 0,
      limit: summary.limits.linksPerMonth as number,
      allowed: (summary.current.linksPerMonth ?? 0) < ((summary.limits.linksPerMonth as number) === -1 ? Infinity : (summary.limits.linksPerMonth as number)),
    },
    clicksTrackedPerMonth: {
      current: summary.current.clicksTrackedPerMonth ?? 0,
      limit: summary.limits.clicksTrackedPerMonth as number,
      allowed: (summary.current.clicksTrackedPerMonth ?? 0) < ((summary.limits.clicksTrackedPerMonth as number) === -1 ? Infinity : (summary.limits.clicksTrackedPerMonth as number)),
    },
    customDomains: {
      current: summary.current.customDomains ?? 0,
      limit: summary.limits.customDomains as number,
      allowed: (summary.current.customDomains ?? 0) < ((summary.limits.customDomains as number) === -1 ? Infinity : (summary.limits.customDomains as number)),
    },
    teamMembers: {
      current: summary.current.teamMembers ?? 0,
      limit: summary.limits.teamMembers as number,
      allowed: (summary.current.teamMembers ?? 0) < ((summary.limits.teamMembers as number) === -1 ? Infinity : (summary.limits.teamMembers as number)),
    },
    bioPages: {
      current: summary.current.bioPages ?? 0,
      limit: summary.limits.bioPages as number,
      allowed: (summary.current.bioPages ?? 0) < ((summary.limits.bioPages as number) === -1 ? Infinity : (summary.limits.bioPages as number)),
    },
    qrCodesPerMonth: {
      current: summary.current.qrCodesPerMonth ?? 0,
      limit: summary.limits.qrCodesPerMonth as number,
      allowed: (summary.current.qrCodesPerMonth ?? 0) < ((summary.limits.qrCodesPerMonth as number) === -1 ? Infinity : (summary.limits.qrCodesPerMonth as number)),
    },
  };
  
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspace.id),
    orderBy: [desc(subscriptions.createdAt)]
  });

  const history = await db.query.billingEvents.findMany({
    where: eq(billingEvents.workspaceId, workspace.id),
    orderBy: [desc(billingEvents.createdAt)],
    limit: 12
  });

  const plan = PLANS[workspace.plan as PlanKey] || PLANS.free;
  const isBusiness = workspace.plan === 'business';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your subscription, view billing history, and monitor your usage.</p>
      </div>

      <div className="bg-background border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold">Current Plan</h2>
            <PlanBadge plan={workspace.plan} />
          </div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-3xl font-bold">
              ${sub?.billingCycle === 'annual' ? plan.annualPrice : plan.price}
            </span>
            <span className="text-muted-foreground mb-1">
              / mo {sub?.billingCycle === 'annual' ? '(Billed annually)' : '(Billed monthly)'}
            </span>
          </div>
          {sub?.currentPeriodEnd && !sub.cancelAtPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Next billing date is {format(new Date(sub.currentPeriodEnd), 'MMMM do, yyyy')}
            </p>
          )}
          {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
            <p className="text-sm text-red-500 font-medium">
              Cancels at end of period ({format(new Date(sub.currentPeriodEnd), 'MMMM do, yyyy')})
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {workspace.dodoCustomerId ? (
            <ManageSubscriptionButton />
          ) : (
            <Link href="/pricing" className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-center shadow-sm">
              Upgrade Plan
            </Link>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Current Usage</h2>
        <UsageMeters summary={formattedSummary as any} plan={workspace.plan as PlanKey} />
      </div>

      {!isBusiness && (
        <div>
          <h2 className="text-xl font-bold mb-4">Upgrade your plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PLANS).map(([key, p]) => {
              if (p.price <= plan.price) return null; // Only show upgrades
              return (
                <div key={key} className="bg-background border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <p className="text-2xl font-bold mt-2">${p.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                    <ul className="mt-4 space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {p.limits.linksPerMonth === -1 ? 'Unlimited' : p.limits.linksPerMonth.toLocaleString()} Links/mo
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {p.limits.customDomains} Custom Domains
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {p.limits.teamMembers} Team Members
                      </li>
                    </ul>
                  </div>
                  <UpgradeButton plan={key as PlanKey} billingCycle="annual" label={`Upgrade to ${p.name}`} />
                </div>
              );
            }).filter(Boolean).slice(0, 2)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Billing History</h2>
        {history.length === 0 ? (
          <div className="bg-background border border-border rounded-xl p-8 text-center shadow-sm">
            <p className="text-muted-foreground">No billing history yet.</p>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">{event.createdAt ? format(new Date(event.createdAt), 'MMM do, yyyy') : '-'}</td>
                    <td className="px-4 py-3 font-medium">LinkForge {event.toPlan} Plan</td>
                    <td className="px-4 py-3">
                      {event.amount && event.currency ? `${(Number(event.amount) / 100).toLocaleString('en-US', { style: 'currency', currency: event.currency })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {event.eventType === 'payment.succeeded' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {event.eventType}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

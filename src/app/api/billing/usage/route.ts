// src/app/api/billing/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links, domains, workspaces } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUsage, getEffectiveLimits } from "@/lib/billing/usage";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const searchParams = req.nextUrl.searchParams;
        const workspaceId = searchParams.get("workspaceId");
        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
        if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

        // Static totals (not monthly)
        const [{ linkCount }] = await db
            .select({ linkCount: sql<number>`count(*)::int` })
            .from(links)
            .where(eq(links.workspaceId, workspaceId));

        const [{ domainCount }] = await db
            .select({ domainCount: sql<number>`count(*)::int` })
            .from(domains)
            .where(eq(domains.workspaceId, workspaceId));

        // Monthly usage
        const monthly = await getUsage(workspaceId);
        const el = await getEffectiveLimits(workspaceId);

        return NextResponse.json({
            workspaceId,
            plan: ws.plan,
            totals: {
                links: linkCount,
                domains: domainCount,
            },
            monthly: {
                linksCreated: monthly.linksCreated,
                domainsCreated: monthly.domainsCreated,
                apiCalls: monthly.apiCalls,
                clicksTracked: monthly.clicksTracked,
                monthStart: monthly.monthStart,
            },
            limits: {
                // Authoritative plan limits (from PLANS merged with usageOverrides)
                linksPerMonth: el.linksPerMonth,
                clicksTrackedPerMonth: el.clicksTrackedPerMonth,
                customDomains: el.customDomains,
                teamMembers: el.teamMembers,
                bioPages: el.bioPages,
                apiCallsPerHour: el.apiCallsPerHour,
                analyticsRetentionDays: el.analyticsRetentionDays,
                abTestingEnabled: el.abTestingEnabled,
                bulkCreateEnabled: el.bulkCreateEnabled,
                defaultDomainEnabled: el.defaultDomainEnabled,
                mixedDomainRoleEnabled: el.mixedDomainRoleEnabled,
                // Back-compat summary fields (approximate monthly API calls if finite)
                links: el.linksPerMonth === -1 ? 'unlimited' as any : (el.linksPerMonth as any),
                domains: (el.customDomains as number) === -1 ? 'unlimited' as any : (el.customDomains as any),
                apiCalls: el.apiCallsPerHour === -1 ? 'unlimited' as any : (el.apiCallsPerHour * 24 * 30) as any,
                clicksTracked: el.clicksTrackedPerMonth === -1 ? 'unlimited' as any : (el.clicksTrackedPerMonth as any),
                workspaces: el.maxOrganizations === -1 ? 'unlimited' as any : (el.maxOrganizations as any),
                whiteLabel: !!el.whiteLabelEnabled,
                notes: {
                    links: el.linksPerMonth === -1 ? "unlimited" : `${el.linksPerMonth}/mo`,
                    domains: (el.customDomains as number) === -1 ? "unlimited" : `${el.customDomains}`,
                    apiCalls: el.apiCallsPerHour === -1 ? "unlimited" : `${el.apiCallsPerHour}/hr`,
                    clicksTracked: el.clicksTrackedPerMonth === -1 ? "unlimited" : `${el.clicksTrackedPerMonth}/mo`,
                },
            },
        });
    } catch (err) {
        console.error("[GET /api/billing/usage]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
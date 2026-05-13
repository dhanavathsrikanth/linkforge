// src/app/api/billing/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links, domains, workspaces } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUsage } from "@/lib/billing/usage";
import { resolvePlanLimits, isUnlimited } from "@/lib/billing/planLimits";

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
        const limits = resolvePlanLimits(ws.plan);

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
                links: limits.links,
                domains: limits.domains,
                apiCalls: limits.apiCalls,
                clicksTracked: limits.clicksTracked,
                workspaces: limits.workspaces,
                whiteLabel: !!limits.whiteLabel,
                notes: {
                    links: isUnlimited(limits.links) ? "unlimited" : `${limits.links}`,
                    domains: isUnlimited(limits.domains) ? "unlimited" : `${limits.domains}`,
                    apiCalls: isUnlimited(limits.apiCalls) ? "unlimited" : `${limits.apiCalls}/mo`,
                    clicksTracked: isUnlimited(limits.clicksTracked) ? "unlimited" : `${limits.clicksTracked}/mo`,
                },
            },
        });
    } catch (err) {
        console.error("[GET /api/billing/usage]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
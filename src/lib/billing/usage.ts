// src/lib/billing/usage.ts
import { db } from "@/lib/db";
import { usageCounters } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { resolvePlanLimits, LimitValue, isUnlimited, pct } from "./planLimits";

export type UsageField = "linksCreated" | "domainsCreated" | "apiCalls" | "clicksTracked";

export function monthStartUTC(d = new Date()): Date {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
    return dt;
}

export async function getOrCreateUsage(workspaceId: string) {
    const mStart = monthStartUTC();
    let row = await db.query.usageCounters.findFirst({
        where: and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.monthStart, mStart)),
    });
    if (!row) {
        const [created] = await db
            .insert(usageCounters)
            .values({
                workspaceId,
                monthStart: mStart,
                linksCreated: 0,
                domainsCreated: 0,
                apiCalls: 0,
                clicksTracked: 0,
            })
            .returning();
        row = created;
    }
    return row!;
}

export async function incrementUsage(workspaceId: string, field: UsageField, by = 1) {
    const mStart = monthStartUTC();
    const col =
        field === "linksCreated"
            ? usageCounters.linksCreated
            : field === "domainsCreated"
                ? usageCounters.domainsCreated
                : field === "apiCalls"
                    ? usageCounters.apiCalls
                    : usageCounters.clicksTracked;

    // Upsert-ish: ensure row exists then increment atomically
    await getOrCreateUsage(workspaceId);
    await db
        .update(usageCounters)
        .set({ [col.name]: sql`${col} + ${by}` } as any)
        .where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.monthStart, mStart)));
}

export async function getUsage(workspaceId: string) {
    const mStart = monthStartUTC();
    const row = await db.query.usageCounters.findFirst({
        where: and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.monthStart, mStart)),
    });
    return (
        row || {
            linksCreated: 0,
            domainsCreated: 0,
            apiCalls: 0,
            clicksTracked: 0,
            monthStart: mStart,
            workspaceId,
        }
    );
}

export function computeUsageProgress(plan: string | undefined, current: number, max: LimitValue) {
    const limits = resolvePlanLimits(plan);
    const percentage = pct(current, max);
    return { percentage, unlimited: isUnlimited(max) };
}
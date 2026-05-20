import { db, users, workspaces } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { PLANS, PlanKey } from "./plans";

/**
 * Check if a user can create another organization workspace based on their plan.
 * Returns { allowed, current, limit }
 */
export async function checkUserWorkspaceLimit(clerkUserId: string) {
  const [dbUser] = await db
    .select({ id: users.id, plan: users.plan })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!dbUser) {
    return { allowed: false, current: 0, limit: 0, reason: "User not found" as const };
  }

  const plan = dbUser.plan as PlanKey;
  const planLimits = PLANS[plan]?.limits;
  if (!planLimits) {
    return { allowed: false, current: 0, limit: 0, reason: "Invalid plan" as const };
  }

  const maxOrgs = planLimits.maxOrganizations;

  // -1 = unlimited
  if (maxOrgs === -1) {
    return { allowed: true, current: 0, limit: -1, reason: null };
  }

  // Count non-personal workspaces owned by this user
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(
      sql`${workspaces.ownerId} = ${dbUser.id} AND ${workspaces.clerkOrgId} IS NOT NULL`
    );

  const allowed = count < maxOrgs;
  return { allowed, current: count, limit: maxOrgs, reason: allowed ? null : "Plan limit reached" as const };
}

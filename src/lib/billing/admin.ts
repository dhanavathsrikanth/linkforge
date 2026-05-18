import { db } from "@/lib/db";
import { usageOverrides } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resetUsageForWorkspace } from "./usage";
import { PlanLimits } from "./plans";

export async function setUsageOverride(
  workspaceId: string,
  overrides: Partial<PlanLimits>,
  reason: string,
  adminUserId: string,
  expiresAt?: Date
) {
  await db.insert(usageOverrides)
    .values({ workspaceId, ...overrides, reason, updatedBy: adminUserId, expiresAt })
    .onConflictDoUpdate({
      target: usageOverrides.workspaceId,
      set: { ...overrides, reason, updatedBy: adminUserId, expiresAt }
    });
  
  await resetUsageForWorkspace(workspaceId);
}

export async function clearUsageOverride(workspaceId: string) {
  await db.delete(usageOverrides)
    .where(eq(usageOverrides.workspaceId, workspaceId));
  await resetUsageForWorkspace(workspaceId);
}

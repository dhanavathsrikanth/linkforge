import { db } from "@/lib/db";
import { workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export type MemberRole = "owner" | "admin" | "editor" | "viewer";

export interface ResolvedWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: MemberRole;
  isPersonal: boolean;
}

/**
 * Resolve the active workspace for a user.
 * If workspaceId is provided, validates the user is a member (owner or workspaceMembers).
 * If not provided, returns the user's personal workspace.
 * Throws if no workspace is found or accessible.
 */
export async function resolveUserWorkspace(
  dbUserId: string,
  workspaceId?: string | null
): Promise<ResolvedWorkspace> {
  if (workspaceId) {
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!ws) throw new Error("Workspace not found");

    // Check if user is owner
    if (ws.ownerId === dbUserId) {
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan || "free",
        role: "owner",
        isPersonal: !ws.clerkOrgId,
      };
    }

    // Check if user is a member
    const [membership] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, dbUserId)
        )
      )
      .limit(1);

    if (!membership) throw new Error("Not a member of this workspace");

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      plan: ws.plan || "free",
      role: membership.role as MemberRole,
      isPersonal: !ws.clerkOrgId,
    };
  }

  // Fall back to personal workspace
  let [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, dbUserId))
    .limit(1);

  if (!ws) {
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, dbUserId))
      .limit(1);

    if (membership) {
      const [memberWs] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, membership.workspaceId))
        .limit(1);
      ws = memberWs;
    }
  }

  if (!ws) throw new Error("No workspace found");

  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    plan: ws.plan || "free",
    role: "owner",
    isPersonal: true,
  };
}

const WRITER_ROLES: MemberRole[] = ["owner", "admin", "editor"];
const ADMIN_ROLES: MemberRole[] = ["owner", "admin"];

export function canWrite(role: MemberRole): boolean {
  return WRITER_ROLES.includes(role);
}

export function canAdmin(role: MemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}

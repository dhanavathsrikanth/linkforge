import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        plan: users.plan,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = user[0];

    // Get user's workspaces
    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        logo: workspaces.logo,
        customDomain: workspaces.customDomain,
        isDefault: workspaces.isDefault,
        plan: workspaces.plan,
        role: workspaceMembers.role,
      })
      .from(workspaces)
      .leftJoin(workspaceMembers, and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, userData.id)
      ))
      .where(eq(workspaces.ownerId, userData.id))
      .union(
        db
          .select({
            id: workspaces.id,
            name: workspaces.name,
            slug: workspaces.slug,
            logo: workspaces.logo,
            customDomain: workspaces.customDomain,
            isDefault: workspaces.isDefault,
            plan: workspaces.plan,
            role: workspaceMembers.role,
          })
          .from(workspaceMembers)
          .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
          .where(eq(workspaceMembers.userId, userData.id))
      );

    // Find default workspace or first workspace
    const defaultWorkspace = userWorkspaces.find(w => w.isDefault) || userWorkspaces[0];

    return NextResponse.json({
      user: userData,
      workspaces: userWorkspaces,
      currentWorkspace: defaultWorkspace,
    });
  } catch (error) {
    console.error("[API_USER_ME] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

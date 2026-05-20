import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { workspaces, users, workspaceMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }

    // If an org ID is specified, look up that org-linked workspace
    if (orgId) {
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.clerkOrgId, orgId))
        .limit(1);

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found for org' }, { status: 404 });
      }

      // Get the requesting user's role in this workspace
      const [membership] = await db
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, dbUser.id)
          )
        )
        .limit(1);

      // Get all members
      const members = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspace.id),
        with: { user: true },
      });

      return NextResponse.json({
        workspace: {
          ...workspace,
          role: workspace.ownerId === dbUser.id ? 'owner' : (membership?.role || 'viewer'),
          members: members.map((m: any) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            email: m.email,
            workspaceName: m.workspaceName,
            user: m.user ? {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              avatar: m.user.avatar,
            } : null,
          })),
        },
      });
    }

    // Personal workspace lookup (existing behavior)
    let [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, dbUser.id))
      .limit(1);

    // Check if user is a member of any workspace via workspaceMembers
    if (!workspace) {
      const [membership] = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, dbUser.id))
        .limit(1);

      if (membership) {
        const [ws] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, membership.workspaceId))
          .limit(1);
        workspace = ws;
      }
    }

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Get members for personal workspace too
    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspace.id),
      with: { user: true },
    });

    return NextResponse.json({
      workspace: {
        ...workspace,
        role: 'owner',
        members: members.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          email: m.email,
          workspaceName: m.workspaceName,
          user: m.user ? {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
          } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Workspace fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

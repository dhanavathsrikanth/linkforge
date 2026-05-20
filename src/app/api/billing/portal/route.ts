import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { workspaces, workspaceMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createBillingPortalSession } from '@/lib/billing/dodo';
import { getOrCreateDbUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await req.json().catch(() => ({}));

    let workspace;
    if (workspaceId) {
      workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });
    } else {
      const [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, dbUser.id))
        .limit(1);
      workspace = ws;
    }

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Only owner or admin can access billing portal
    if (workspace.ownerId !== dbUser.id) {
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

      if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
        return NextResponse.json({ error: 'Only workspace owners and admins can manage billing' }, { status: 403 });
      }
    }

    if (!workspace.dodoCustomerId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    const { portalUrl } = await createBillingPortalSession(workspace.dodoCustomerId, workspace.id);

    return NextResponse.json({ portalUrl });
  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

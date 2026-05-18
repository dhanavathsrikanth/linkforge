import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

    const userWorkspaces = await db.query.workspaces.findMany({
      where: eq(workspaces.ownerId, dbUser.id),
    });

    const workspace = userWorkspaces[0];
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
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

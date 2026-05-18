import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { workspaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createCheckoutSession, getOrCreateDodoCustomer } from '@/lib/billing/dodo';
import { getOrCreateDbUser } from '@/lib/auth';
import { PlanKey } from '@/lib/billing/plans';

const checkoutSchema = z.object({
  plan: z.enum(['free', 'starter', 'growth', 'agency', 'business'] as const),
  billingCycle: z.enum(['monthly', 'annual']),
});

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

    const body = await req.json();
    const { plan, billingCycle } = checkoutSchema.parse(body);

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress || '';
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || email;

    const userWorkspaces = await db.query.workspaces.findMany({
      where: eq(workspaces.ownerId, dbUser.id),
    });

    const workspace = userWorkspaces[0];
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    if (workspace.ownerId !== userId) {
      return NextResponse.json({ error: 'Only owners can upgrade billing' }, { status: 403 });
    }

    await getOrCreateDodoCustomer(email, name, workspace.id);

    const { checkoutUrl } = await createCheckoutSession({
      workspaceId: workspace.id,
      userId,
      email,
      plan,
      billingCycle,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

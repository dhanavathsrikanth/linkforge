import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { workspaces, workspaceMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createCheckoutSession, getOrCreateDodoCustomer } from '@/lib/billing/dodo';
import { PlanKey } from '@/lib/billing/plans';
import { getOrCreateDbUser } from '@/lib/auth';

const checkoutSchema = z.object({
  plan: z.enum(['free', 'starter', 'growth', 'agency', 'business'] as const),
  billingCycle: z.enum(['monthly', 'annual']),
  workspaceId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      const createdUser = await getOrCreateDbUser();
      dbUser = createdUser || undefined;
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan, billingCycle, workspaceId } = checkoutSchema.parse(body);

    const email = dbUser.email || '';
    const name = (dbUser.name || dbUser.email || '').trim() || email;

    // Resolve workspace: use provided workspaceId or fall back to personal workspace
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

    // Only owner or admin role can upgrade billing
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
        return NextResponse.json({ error: 'Only workspace owners and admins can upgrade billing' }, { status: 403 });
      }
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

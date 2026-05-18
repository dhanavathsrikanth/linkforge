import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { workspaces, subscriptions, billingEvents } from '@/lib/db/schema';
import { resetUsageForWorkspace } from '@/lib/billing/usage';
import { sendPlanUpgradedEmail } from '@/lib/email';
import { resend } from '@/lib/resend';
import { eq } from 'drizzle-orm';
import { PlanKey } from '@/lib/billing/plans';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList = req.headers;
    
    const svix_id = headersList.get("svix-id");
    const svix_timestamp = headersList.get("svix-timestamp");
    const svix_signature = headersList.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Missing svix headers', { status: 400 });
    }

    const wh = new Webhook(process.env.DODO_WEBHOOK_SECRET || '');

    let payload: any;
    try {
      payload = wh.verify(rawBody, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    const eventType = payload.type;

    // IDEMPOTENCY CHECK - do this FIRST before any DB writes
    const existing = await db.query.billingEvents.findFirst({
      where: eq(billingEvents.dodoEventId, payload.id)
    });
    
    if (existing) {
      return new Response('Already processed', { status: 200 });
    }

    if (eventType === 'payment.succeeded') {
      const workspaceId = payload.data.metadata?.workspaceId;
      const plan = payload.data.metadata?.plan as PlanKey;
      const billingCycle = payload.data.metadata?.billingCycle || 'monthly';
      const amount = payload.data.total_amount || payload.data.amount || 0;
      const currency = payload.data.currency || 'USD';
      const customerId = payload.data.customer_id;
      const subscriptionId = payload.data.subscription_id;

      if (!workspaceId) return new Response('Missing workspaceId', { status: 200 });

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        with: { owner: true }
      });
      if (!workspace) return new Response('Workspace not found', { status: 200 });

      const fromPlan = workspace.plan || 'free';

      await db.update(workspaces)
        .set({ 
          plan, 
          planUpdatedAt: new Date(), 
          dodoCustomerId: customerId 
        })
        .where(eq(workspaces.id, workspaceId));

      if (subscriptionId) {
        const currentPeriodStart = payload.data.current_period_start ? new Date(payload.data.current_period_start) : new Date();
        const currentPeriodEnd = payload.data.current_period_end ? new Date(payload.data.current_period_end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const subData = {
          workspaceId,
          dodoSubscriptionId: subscriptionId,
          dodoCustomerId: customerId,
          plan,
          billingCycle: billingCycle as 'monthly' | 'annual',
          status: 'active' as const,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        };

        const existingSub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.dodoSubscriptionId, subscriptionId)
        });

        if (existingSub) {
          await db.update(subscriptions).set(subData).where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
        } else {
          await db.insert(subscriptions).values({ ...subData, createdAt: new Date() });
        }
      }

      await db.insert(billingEvents).values({
        workspaceId,
        eventType: 'payment.succeeded',
        fromPlan: fromPlan as PlanKey,
        toPlan: plan,
        amount: amount.toString(),
        currency,
        dodoEventId: payload.id
      });

      // Clears Redis so new limits apply immediately
      await resetUsageForWorkspace(workspaceId);

      const ownerEmail = workspace.owner?.email;
      const ownerName = workspace.owner?.name || workspace.owner?.email || 'there';
      if (ownerEmail) {
        // Fire in background so webhook returns fast
        setTimeout(() => {
          sendPlanUpgradedEmail(ownerEmail, {
            name: ownerName,
            plan,
            billingCycle: billingCycle as 'monthly' | 'annual',
          }).catch(() => {});
        }, 0);
      }
    } 
    else if (eventType === 'subscription.cancelled') {
      const workspaceId = payload.data.metadata?.workspaceId;
      const subscriptionId = payload.data.subscription_id;

      if (!workspaceId) return new Response('Missing workspaceId', { status: 200 });

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        with: { owner: true }
      });
      const fromPlan = workspace?.plan || 'free';

      await db.update(workspaces)
        .set({ plan: 'free', planUpdatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId));

      if (subscriptionId) {
        await db.update(subscriptions)
          .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
          .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
      }

      await db.insert(billingEvents).values({
        workspaceId,
        eventType: 'subscription.cancelled',
        fromPlan: fromPlan as PlanKey,
        toPlan: 'free',
        dodoEventId: payload.id
      });

      await resetUsageForWorkspace(workspaceId);

      const ownerEmail = workspace?.owner?.email;
      if (ownerEmail) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@linkforge.app',
            to: ownerEmail,
            subject: `Your LinkForge subscription has been cancelled`,
            html: `<p>Your subscription has been cancelled. You're now on the Free plan.</p>`
          });
        } catch (e) {
          console.error('Email error:', e);
        }
      }
    }
    else if (eventType === 'subscription.updated') {
      const workspaceId = payload.data.metadata?.workspaceId;
      const newPlan = payload.data.metadata?.plan as PlanKey;
      const subscriptionId = payload.data.subscription_id;
      
      if (!workspaceId) return new Response('Missing workspaceId', { status: 200 });

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
      });
      const fromPlan = workspace?.plan || 'free';
      const isHigherTier = newPlan !== fromPlan && newPlan !== 'free'; 

      await db.update(workspaces)
        .set({ plan: newPlan, planUpdatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId));

      const currentPeriodStart = payload.data.current_period_start ? new Date(payload.data.current_period_start) : new Date();
      const currentPeriodEnd = payload.data.current_period_end ? new Date(payload.data.current_period_end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (subscriptionId) {
        await db.update(subscriptions)
          .set({ 
            status: payload.data.status || 'active',
            billingCycle: payload.data.metadata?.billingCycle || 'monthly',
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: new Date() 
          })
          .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
      }

      await db.insert(billingEvents).values({
        workspaceId,
        eventType: 'subscription.updated',
        fromPlan: fromPlan as PlanKey,
        toPlan: newPlan,
        dodoEventId: payload.id
      });

      if (isHigherTier) {
        await resetUsageForWorkspace(workspaceId);
      }
    }
    else if (eventType === 'payment.failed') {
      const subscriptionId = payload.data.subscription_id;
      const workspaceId = payload.data.metadata?.workspaceId;

      if (subscriptionId) {
        await db.update(subscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
      }

      await db.insert(billingEvents).values({
        workspaceId,
        eventType: 'payment.failed',
        dodoEventId: payload.id
      });

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        with: { owner: true }
      });
      const ownerEmail = workspace?.owner?.email;

      if (ownerEmail) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@linkforge.app',
            to: ownerEmail,
            subject: `Payment Failed - LinkForge`,
            html: `<p>We were unable to process your recent payment. Please update your billing information in the portal.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing">Update Billing Info</a></p>`
          });
        } catch (e) {
          console.error('Email error:', e);
        }
      }
    }
    else if (eventType === 'subscription.trialing') {
      const workspaceId = payload.data.metadata?.workspaceId;
      const newPlan = payload.data.metadata?.plan as PlanKey;
      const subscriptionId = payload.data.subscription_id;
      
      if (!workspaceId) return new Response('Missing workspaceId', { status: 200 });

      const trialEndsAt = payload.data.trial_end ? new Date(payload.data.trial_end) : new Date();

      await db.update(workspaces)
        .set({ plan: newPlan, trialEndsAt })
        .where(eq(workspaces.id, workspaceId));

      if (subscriptionId) {
        await db.update(subscriptions)
          .set({ status: 'trialing', updatedAt: new Date() })
          .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
      }

      await db.insert(billingEvents).values({
        workspaceId,
        eventType: 'subscription.trialing',
        dodoEventId: payload.id
      });
    }
    else {
      console.log(`[Dodo Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[Dodo Webhook] Error:', error);
    // STILL return 200 — do not return 500 to Dodo
    // A 500 causes Dodo to retry the same event repeatedly
    return new Response('Internal error logged', { status: 200 });
  }
}

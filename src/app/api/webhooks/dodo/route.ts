export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { workspaces, subscriptions, billingEvents } from '@/lib/db/schema';
import { resetUsageForWorkspace } from '@/lib/billing/usage';
import { sendPlanUpgradedEmail } from '@/lib/email';
import { resend } from '@/lib/resend';
import { eq } from 'drizzle-orm';
import { PLANS, PlanKey } from '@/lib/billing/plans';
import { mapProductToPlan, guessPlanFromName } from '@/lib/billing/planMap';
import { getAppUrl } from '@/lib/utils';

// Handle seconds vs milliseconds timestamps safely
function parseTs(input: unknown): Date | undefined {
  if (input == null) return undefined;
  const n = Number(input);
  if (!Number.isFinite(n)) {
    const d = new Date(String(input));
    return isNaN(d.getTime()) ? undefined : d;
  }
  // If value looks like seconds (10 digits), convert to ms
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? undefined : d;
}

// Derive plan from configured PLANS.*.dodoPriceId values when product_id is present.
// This avoids needing extra env for product->plan mapping and ensures we can resolve
// the plan that was actually sold in checkout.
function planFromConfiguredPrices(productId: string | undefined | null): PlanKey | undefined {
  if (!productId) return undefined;
  const pid = String(productId);
  for (const [key, plan] of Object.entries(PLANS)) {
    const ids = plan.dodoPriceId as any;
    if (ids?.monthly && ids.monthly === pid) return key as PlanKey;
    if (ids?.annual && ids.annual === pid) return key as PlanKey;
  }
  return undefined;
}

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

    const wh = new Webhook(
      process.env.DODO_WEBHOOK_SECRET ||
      process.env.DODO_PAYMENTS_WEBHOOK_SECRET ||
      ''
    );

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
    console.log('[Dodo Webhook] Received event', { type: eventType, id: payload?.id });

    // IDEMPOTENCY CHECK - do this FIRST before any DB writes
    const existing = await db.query.billingEvents.findFirst({
      where: eq(billingEvents.dodoEventId, payload.id)
    });

    if (existing) {
      return new Response('Already processed', { status: 200 });
    }

    if (
      eventType === 'payment.succeeded' ||
      eventType === 'invoice.paid' ||
      eventType === 'checkout.completed' ||
      eventType === 'checkout.session.completed'
    ) {
      const raw = payload.data || {};
      const customerId = raw.customer_id || raw.customerId;
      let workspaceId: string | undefined = raw.metadata?.workspaceId as string | undefined;

      // Fallback: resolve workspace by customer id if metadata is missing
      if (!workspaceId && customerId) {
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.dodoCustomerId, customerId),
        });
        workspaceId = ws?.id;
      }

      if (!workspaceId) {
        console.warn('[Dodo Webhook] Missing workspaceId in payment success-like event', {
          type: eventType,
          id: payload?.id,
          customerId,
          metadata: raw?.metadata,
        });
        return new Response('Missing workspaceId', { status: 200 });
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        with: { owner: true }
      });
      if (!workspace) return new Response('Workspace not found', { status: 200 });

      const fromPlan = workspace.plan || 'free';

      const productId =
        raw.product_id ||
        raw.items?.[0]?.product_id ||
        raw.subscription?.items?.[0]?.product_id ||
        raw.price?.product_id;

      const plan =
        (raw.metadata?.plan as PlanKey | undefined) ||
        mapProductToPlan(productId) ||
        planFromConfiguredPrices(productId) ||
        guessPlanFromName(raw.product_name) ||
        (fromPlan as PlanKey);

      const billingCycle =
        (raw.metadata?.billingCycle as 'monthly' | 'annual' | undefined) ||
        raw.interval ||
        raw.items?.[0]?.interval ||
        'monthly';

      const amountMinor = Number(raw.total_amount ?? raw.amount ?? 0);
      const amountDecimal = isFinite(amountMinor) ? (amountMinor / 100).toFixed(2) : '0.00';
      const currency = raw.currency || 'USD';
      const subscriptionId = raw.subscription_id || raw.subscription?.id;

      await db.update(workspaces)
        .set({
          plan,
          planUpdatedAt: new Date(),
          dodoCustomerId: customerId
        })
        .where(eq(workspaces.id, workspaceId));

      if (subscriptionId) {
        const currentPeriodStart = parseTs(payload.data.current_period_start) ?? new Date();
        const currentPeriodEnd =
          parseTs(payload.data.current_period_end) ??
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
        amount: amountDecimal,
        currency,
        dodoEventId: payload.id,
        metadata: {
          sourceEventType: eventType,
          productId,
          subscriptionId,
        } as any
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
          }).catch(() => { });
        }, 0);
      }
    }
    else if (eventType === 'subscription.cancelled') {
      let workspaceId = payload.data.metadata?.workspaceId as string | undefined;
      const subscriptionId = payload.data.subscription_id || payload.data.subscription?.id;

      if (!workspaceId && subscriptionId) {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.dodoSubscriptionId, subscriptionId),
        });
        workspaceId = sub?.workspaceId;
      }
      if (!workspaceId && payload.data.customer_id) {
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.dodoCustomerId, payload.data.customer_id),
        });
        workspaceId = ws?.id;
      }

      if (!workspaceId) {
        console.warn('[Dodo Webhook] Missing workspaceId in subscription.cancelled', {
          id: payload?.id,
          subscriptionId,
          customerId: payload?.data?.customer_id,
          metadata: payload?.data?.metadata,
        });
        return new Response('Missing workspaceId', { status: 200 });
      }

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
      let workspaceId = payload.data.metadata?.workspaceId as string | undefined;
      const subscriptionId = payload.data.subscription_id || payload.data.subscription?.id;

      if (!workspaceId && subscriptionId) {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.dodoSubscriptionId, subscriptionId),
        });
        workspaceId = sub?.workspaceId;
      }
      if (!workspaceId && payload.data.customer_id) {
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.dodoCustomerId, payload.data.customer_id),
        });
        workspaceId = ws?.id;
      }

      if (!workspaceId) {
        console.warn('[Dodo Webhook] Missing workspaceId in subscription.updated', {
          id: payload?.id,
          subscriptionId,
          customerId: payload?.data?.customer_id,
          metadata: payload?.data?.metadata,
        });
        return new Response('Missing workspaceId', { status: 200 });
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
      });
      const fromPlan = workspace?.plan || 'free';

      const raw = payload.data || {};
      const productId =
        raw.product_id ||
        raw.items?.[0]?.product_id ||
        raw.subscription?.items?.[0]?.product_id ||
        raw.price?.product_id;

      const newPlan =
        (raw.metadata?.plan as PlanKey | undefined) ||
        mapProductToPlan(productId) ||
        planFromConfiguredPrices(productId) ||
        guessPlanFromName(raw.product_name) ||
        (fromPlan as PlanKey);

      const isHigherTier = newPlan !== fromPlan && newPlan !== 'free';

      await db.update(workspaces)
        .set({ plan: newPlan, planUpdatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId));

      const currentPeriodStart = parseTs(payload.data.current_period_start) ?? new Date();
      const currentPeriodEnd = parseTs(payload.data.current_period_end) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
      const subscriptionId = payload.data.subscription_id || payload.data.subscription?.id;
      let workspaceId = payload.data.metadata?.workspaceId as string | undefined;

      if (!workspaceId && subscriptionId) {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.dodoSubscriptionId, subscriptionId),
        });
        workspaceId = sub?.workspaceId;
      }
      if (!workspaceId && payload.data.customer_id) {
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.dodoCustomerId, payload.data.customer_id),
        });
        workspaceId = ws?.id;
      }

      if (!workspaceId) return new Response('Missing workspaceId', { status: 200 });

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

      let ownerEmail: string | undefined;
      if (workspaceId) {
        const wsForEmail = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId),
          with: { owner: true }
        });
        ownerEmail = wsForEmail?.owner?.email;
      }

      if (ownerEmail) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'hello@linkforge.app',
            to: ownerEmail,
            subject: `Payment Failed - LinkForge`,
            html: `<p>We were unable to process your recent payment. Please update your billing information in the portal.</p><p><a href="${getAppUrl()}/dashboard/settings/billing">Update Billing Info</a></p>`
          });
        } catch (e) {
          console.error('Email error:', e);
        }
      }
    }
    else if (eventType === 'subscription.trialing') {
      let workspaceId = payload.data.metadata?.workspaceId as string | undefined;
      const newPlan = payload.data.metadata?.plan as PlanKey;
      const subscriptionId = payload.data.subscription_id || payload.data.subscription?.id;

      if (!workspaceId && subscriptionId) {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.dodoSubscriptionId, subscriptionId),
        });
        workspaceId = sub?.workspaceId;
      }
      if (!workspaceId && payload.data.customer_id) {
        const ws = await db.query.workspaces.findFirst({
          where: eq(workspaces.dodoCustomerId, payload.data.customer_id),
        });
        workspaceId = ws?.id;
      }

      if (!workspaceId) {
        console.warn('[Dodo Webhook] Missing workspaceId in subscription.trialing', {
          id: payload?.id,
          subscriptionId,
          customerId: payload?.data?.customer_id,
          metadata: payload?.data?.metadata,
        });
        return new Response('Missing workspaceId', { status: 200 });
      }

      const trialEndsAt = parseTs(payload.data.trial_end) ?? new Date();

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
      try {
        await db.insert(billingEvents).values({
          workspaceId: payload?.data?.metadata?.workspaceId,
          eventType,
          dodoEventId: payload.id,
          metadata: payload as any,
        });
      } catch (err) {
        console.error('[Dodo Webhook] Failed to persist unhandled event', err);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[Dodo Webhook] Error:', error);
    // STILL return 200 — do not return 500 to Dodo
    // A 500 causes Dodo to retry the same event repeatedly
    return new Response('Internal error logged', { status: 200 });
  }
}

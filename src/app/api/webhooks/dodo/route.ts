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
import { sendWebhookEvent } from '@/lib/svix/send';

/** Extract workspaceId via chained fallbacks: metadata → subscription → customer → default */
async function resolveWorkspaceId(raw: Record<string, any>): Promise<string | undefined> {
  // 1. Metadata on the event data itself (Payment/Subscription.metadata)
  const fromMetadata = raw.metadata?.workspaceId as string | undefined;
  if (fromMetadata) return fromMetadata;

  // 2. Subscription lookup — payment events carry subscription_id
  const subId = raw.subscription_id || raw.subscription?.id;
  if (subId) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.dodoSubscriptionId, subId),
    });
    if (sub?.workspaceId) return sub.workspaceId;
  }

  // 3. Customer lookup — Dodo nests customer_id inside customer object
  const customerId = raw.customer?.customer_id || raw.customer_id || raw.customerId;
  if (customerId) {
    const ws = await db.query.workspaces.findFirst({
      where: eq(workspaces.dodoCustomerId, customerId),
    });
    if (ws?.id) return ws.id;
  }

  return undefined;
}

/** Extract product_id from Payment or Subscription event data */
function resolveProductId(raw: Record<string, any>): string | undefined {
  // Subscription events have product_id at top level
  if (raw.product_id) return raw.product_id;
  // Payment events have product_cart array
  if (raw.product_cart?.[0]?.product_id) return raw.product_cart[0].product_id;
  // Fallback — some events nest it differently
  if (raw.items?.[0]?.product_id) return raw.items[0].product_id;
  if (raw.price?.product_id) return raw.price.product_id;
  return undefined;
}

/** Normalize Dodo's TimeInterval ('Month'|'Year') to internal format ('monthly'|'annual') */
function normalizeBillingCycle(interval: string | undefined | null): 'monthly' | 'annual' | undefined {
  if (!interval) return undefined;
  const s = String(interval).toLowerCase();
  if (s === 'month' || s === 'monthly') return 'monthly';
  if (s === 'year' || s === 'annual') return 'annual';
  return undefined;
}

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

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList = req.headers;

    const svix_id = headersList.get("webhook-id");
    const svix_timestamp = headersList.get("webhook-timestamp");
    const svix_signature = headersList.get("webhook-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Missing webhook headers', { status: 400 });
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

    // Ack immediately — Dodo webhook client has a short timeout.
    // Process the event asynchronously in the background.
    processEvent(payload, eventType).catch((err) =>
      console.error('[Dodo Webhook] Background processing failed:', err)
    );

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[Dodo Webhook] Error:', error);
    return new Response('Internal error logged', { status: 200 });
  }
}

async function processEvent(payload: any, eventType: string) {
  // IDEMPOTENCY CHECK - do this FIRST before any DB writes
  const existing = await db.query.billingEvents.findFirst({
    where: eq(billingEvents.dodoEventId, payload.id)
  });

  if (existing) {
    console.log('[Dodo Webhook] Already processed, skipping', { id: payload.id });
    return;
  }

  if (
    eventType === 'payment.succeeded' ||
    eventType === 'invoice.paid' ||
    eventType === 'checkout.completed' ||
    eventType === 'checkout.session.completed'
  ) {
    const raw = payload.data || {};
    const customerId = raw.customer?.customer_id || raw.customer_id || raw.customerId;
    const workspaceId = await resolveWorkspaceId(raw);
    const subscriptionId = raw.subscription_id || raw.subscription?.id;

    if (!workspaceId) {
      console.warn('[Dodo Webhook] Missing workspaceId in payment success-like event', {
        type: eventType, id: payload?.id, customerId, subscriptionId, metadata: raw?.metadata,
      });
      return;
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      with: { owner: true }
    });
    if (!workspace) return;

    const fromPlan = workspace.plan || 'free';
    const productId = resolveProductId(raw);

    const plan =
      (raw.metadata?.plan as PlanKey | undefined) ||
      mapProductToPlan(productId) ||
      guessPlanFromName(raw.product_name || raw.name) ||
      (fromPlan as PlanKey);

    const billingCycle =
      (raw.metadata?.billingCycle as 'monthly' | 'annual' | undefined) ||
      normalizeBillingCycle(raw.payment_frequency_interval) ||
      'monthly';

    const amountMinor = Number(raw.total_amount ?? raw.amount ?? 0);
    const amountDecimal = isFinite(amountMinor) ? (amountMinor / 100).toFixed(2) : '0.00';
    const currency = raw.currency || 'USD';

    await db.update(workspaces)
      .set({ plan, planUpdatedAt: new Date(), dodoCustomerId: customerId })
      .where(eq(workspaces.id, workspaceId));

    sendWebhookEvent({
      eventType: 'workspace.plan_changed',
      workspaceId,
      data: { fromPlan, toPlan: plan, eventType: 'payment.succeeded' },
      idempotencyKey: `workspace.plan_changed-${workspaceId}-${payload.id}`,
    });

    if (subscriptionId) {
      const currentPeriodStart = parseTs(raw.previous_billing_date) ?? new Date();
      const currentPeriodEnd =
        parseTs(raw.next_billing_date) ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subData = {
        workspaceId, dodoSubscriptionId: subscriptionId, dodoCustomerId: customerId,
        plan, billingCycle: billingCycle as 'monthly' | 'annual', status: 'active' as const,
        currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd: false, updatedAt: new Date()
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
      workspaceId, eventType: 'payment.succeeded',
      fromPlan: fromPlan as PlanKey, toPlan: plan,
      amount: amountDecimal, currency, dodoEventId: payload.id,
      metadata: { sourceEventType: eventType, productId, subscriptionId } as any
    });

    await resetUsageForWorkspace(workspaceId);

    const ownerEmail = workspace.owner?.email;
    const ownerName = workspace.owner?.name || workspace.owner?.email || 'there';
    if (ownerEmail) {
      sendPlanUpgradedEmail(ownerEmail, {
        name: ownerName, plan, billingCycle: billingCycle as 'monthly' | 'annual',
      }).catch(() => {});
    }
  }
  else if (eventType === 'subscription.cancelled') {
    const raw = payload.data || {};
    const workspaceId = await resolveWorkspaceId(raw);
    const subscriptionId = raw.subscription_id || raw.subscription?.id;

    if (!workspaceId) {
      console.warn('[Dodo Webhook] Missing workspaceId in subscription.cancelled', {
        id: payload?.id, subscriptionId, customerId: raw.customer?.customer_id, metadata: raw.metadata,
      });
      return;
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId), with: { owner: true }
    });
    const fromPlan = workspace?.plan || 'free';

    await db.update(workspaces).set({ plan: 'free', planUpdatedAt: new Date() }).where(eq(workspaces.id, workspaceId));

    if (subscriptionId) {
      await db.update(subscriptions)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
    }

    await db.insert(billingEvents).values({
      workspaceId, eventType: 'subscription.cancelled', fromPlan: fromPlan as PlanKey, toPlan: 'free', dodoEventId: payload.id
    });

    sendWebhookEvent({
      eventType: 'workspace.plan_changed',
      workspaceId,
      data: { fromPlan, toPlan: 'free', eventType: 'subscription.cancelled' },
      idempotencyKey: `workspace.plan_changed-${workspaceId}-${payload.id}`,
    });

    await resetUsageForWorkspace(workspaceId);

    const ownerEmail = workspace?.owner?.email;
    if (ownerEmail) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'hello@mail.pivoturl.com', to: ownerEmail,
          subject: `Your PivotUrl subscription has been cancelled`,
          html: `<p>Your subscription has been cancelled. You're now on the Free plan.</p>`
        });
      } catch (e) { console.error('Email error:', e); }
    }
  }
  else if (eventType === 'subscription.updated') {
    const raw = payload.data || {};
    const workspaceId = await resolveWorkspaceId(raw);
    const subscriptionId = raw.subscription_id || raw.subscription?.id;

    if (!workspaceId) {
      console.warn('[Dodo Webhook] Missing workspaceId in subscription.updated', {
        id: payload?.id, subscriptionId, customerId: raw.customer?.customer_id, metadata: raw.metadata,
      });
      return;
    }

    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    const fromPlan = workspace?.plan || 'free';

    const productId = resolveProductId(raw);
    const newPlan =
      (raw.metadata?.plan as PlanKey | undefined) ||
      mapProductToPlan(productId) ||
      guessPlanFromName(raw.product_name || raw.name) || (fromPlan as PlanKey);

    const isHigherTier = newPlan !== fromPlan && newPlan !== 'free';

    await db.update(workspaces).set({ plan: newPlan, planUpdatedAt: new Date() }).where(eq(workspaces.id, workspaceId));

    sendWebhookEvent({
      eventType: 'workspace.plan_changed',
      workspaceId,
      data: { fromPlan, toPlan: newPlan, eventType: 'subscription.updated' },
      idempotencyKey: `workspace.plan_changed-${workspaceId}-${payload.id}`,
    });

    const currentPeriodStart = parseTs(raw.previous_billing_date) ?? new Date();
    const currentPeriodEnd = parseTs(raw.next_billing_date) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (subscriptionId) {
      await db.update(subscriptions).set({
        status: raw.status || 'active',
        billingCycle: normalizeBillingCycle(raw.payment_frequency_interval) ?? 'monthly',
        currentPeriodStart, currentPeriodEnd, updatedAt: new Date()
      }).where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
    }

    await db.insert(billingEvents).values({
      workspaceId, eventType: 'subscription.updated', fromPlan: fromPlan as PlanKey, toPlan: newPlan, dodoEventId: payload.id
    });

    if (isHigherTier) await resetUsageForWorkspace(workspaceId);
  }
  else if (eventType === 'payment.failed') {
    const raw = payload.data || {};
    const workspaceId = await resolveWorkspaceId(raw);
    if (!workspaceId) return;

    const subscriptionId = raw.subscription_id || raw.subscription?.id;

    if (subscriptionId) {
      await db.update(subscriptions).set({ status: 'past_due', updatedAt: new Date() }).where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
    }

    await db.insert(billingEvents).values({ workspaceId, eventType: 'payment.failed', dodoEventId: payload.id });

    if (workspaceId) {
      const wsForEmail = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId), with: { owner: true } });
      const ownerEmail = wsForEmail?.owner?.email;
      if (ownerEmail) {
        try {
          await resend.emails.send({
from: process.env.RESEND_FROM_EMAIL || 'hello@mail.pivoturl.com', to: ownerEmail,
            subject: `Payment Failed - PivotUrl`,
            html: `<p>We were unable to process your recent payment. Please update your billing information in the portal.</p><p><a href="${getAppUrl()}/dashboard/settings/billing">Update Billing Info</a></p>`
          });
        } catch (e) { console.error('Email error:', e); }
      }
    }
  }
  else if (eventType === 'subscription.active' || eventType === 'subscription.trialing') {
    const raw = payload.data || {};
    const workspaceId = await resolveWorkspaceId(raw);
    const subscriptionId = raw.subscription_id || raw.subscription?.id;

    if (!workspaceId) {
      console.warn('[Dodo Webhook] Missing workspaceId in subscription.active/trialing', {
        id: payload?.id, subscriptionId, customerId: raw.customer?.customer_id, metadata: raw.metadata,
      });
      return;
    }

    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    const fromPlan = workspace?.plan || 'free';

    const trialEndsAt = parseTs(raw.trial_end) ?? undefined;

    const productId = resolveProductId(raw);
    const plan =
      (raw.metadata?.plan as PlanKey | undefined) ||
      mapProductToPlan(productId) ||
      guessPlanFromName(raw.product_name || raw.name) || (fromPlan as PlanKey);

    await db.update(workspaces).set({ plan, trialEndsAt }).where(eq(workspaces.id, workspaceId));

    if (subscriptionId) {
      const existingSub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.dodoSubscriptionId, subscriptionId)
      });
      const subData = {
        workspaceId, dodoSubscriptionId: subscriptionId,
        dodoCustomerId: raw.customer?.customer_id || raw.customer_id,
        plan,         billingCycle: normalizeBillingCycle(raw.payment_frequency_interval) ?? 'monthly',
        status: 'trialing' as const, currentPeriodStart: parseTs(raw.previous_billing_date) ?? new Date(),
        currentPeriodEnd: parseTs(raw.next_billing_date) ?? new Date(), cancelAtPeriodEnd: false, updatedAt: new Date()
      };
      if (existingSub) {
        await db.update(subscriptions).set(subData).where(eq(subscriptions.dodoSubscriptionId, subscriptionId));
      } else {
        await db.insert(subscriptions).values({ ...subData, createdAt: new Date() });
      }
    }

    await db.insert(billingEvents).values({ workspaceId, eventType, fromPlan: fromPlan as PlanKey, toPlan: plan, dodoEventId: payload.id });

    await resetUsageForWorkspace(workspaceId);
  }
  else {
    console.log(`[Dodo Webhook] Unhandled event type: ${eventType}`);
    try {
      await db.insert(billingEvents).values({
        workspaceId: payload?.data?.metadata?.workspaceId, eventType, dodoEventId: payload.id, metadata: payload as any,
      });
    } catch (err) { console.error('[Dodo Webhook] Failed to persist unhandled event', err); }
  }
}

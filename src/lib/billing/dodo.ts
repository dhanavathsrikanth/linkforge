import DodoPayments from 'dodopayments';
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS, PlanKey } from "./plans";
import { getAppUrl } from "@/lib/utils";

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_SECRET_KEY || 'dodo_secret_key_placeholder',
  // Use sandbox for development
  environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});

export async function getOrCreateDodoCustomer(email: string, name: string, workspaceId: string) {
  if (!process.env.DODO_SECRET_KEY) {
    throw new Error("DODO_SECRET_KEY is not set in environment variables");
  }
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) throw new Error("Workspace not found");

  if (workspace.dodoCustomerId) {
    return workspace.dodoCustomerId;
  }

  const customer = await dodo.customers.create({
    email,
    name: name || email,
    metadata: { workspaceId }
  } as any);

  const customerId = (customer as any).customerId || (customer as any).customer_id || (customer as any).id;

  await db.update(workspaces)
    .set({ dodoCustomerId: customerId })
    .where(eq(workspaces.id, workspaceId));

  return customerId;
}

export async function createCheckoutSession(params: {
  workspaceId: string;
  userId: string;
  email: string;
  plan: PlanKey;
  billingCycle: 'monthly' | 'annual';
}) {
  if (!process.env.DODO_SECRET_KEY) {
    throw new Error("DODO_SECRET_KEY is not set in environment variables");
  }
  const { workspaceId, userId, plan, billingCycle } = params;

  const priceId = PLANS[plan].dodoPriceId[billingCycle];
  if (!priceId) {
    throw new Error('Cannot checkout free plan');
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) throw new Error("Workspace not found");

  const customerId = workspace.dodoCustomerId;
  if (!customerId) throw new Error("Dodo customer not initialized");

  const successUrl = `${getAppUrl()}/dashboard?billing=success&plan=${plan}`;
  const cancelUrl = `${getAppUrl()}/pricing`;

  // Call dodo to create a checkout session using the official method and snake_case parameters
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: priceId, quantity: 1 }],
    customer: {
      email: params.email,
    },
    return_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { workspaceId, userId, plan, billingCycle }
  });

  return { checkoutUrl: session.checkout_url || '' };
}

export async function createBillingPortalSession(dodoCustomerId: string, workspaceId: string) {
  if (!process.env.DODO_SECRET_KEY) {
    throw new Error("DODO_SECRET_KEY is not set in environment variables");
  }
  const returnUrl = `${getAppUrl()}/dashboard/settings/billing`;
  
  // Create a Dodo customer portal session using the official method and parameters
  const portal = await dodo.customers.customerPortal.create(dodoCustomerId, {
    return_url: returnUrl,
  });

  return { portalUrl: portal.link || '' };
}

export async function cancelSubscription(dodoSubscriptionId: string) {
  // Cancel the Dodo subscription at period end (not immediately)
  try {
    await dodo.subscriptions.update(dodoSubscriptionId, {
      cancel_at_next_billing_date: true,
    });
  } catch(e) {
    console.error("Dodo cancel error:", e);
  }

  // Update subscriptions table: cancelAtPeriodEnd = true
  const { subscriptions } = await import("@/lib/db/schema");
  await db.update(subscriptions)
    .set({ cancelAtPeriodEnd: true })
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubscriptionId));
}

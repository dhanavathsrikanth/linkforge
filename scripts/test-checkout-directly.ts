import DodoPayments from 'dodopayments';
import { db } from "../src/lib/db";
import { workspaces } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLANS } from "../src/lib/billing/plans";

if (!process.env.DODO_SECRET_KEY) {
  throw new Error('DODO_SECRET_KEY is not set');
}

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_SECRET_KEY,
  environment: 'test_mode',
});

async function main() {
  console.log("--- Testing Dodo Checkout Flow ---");
  
  const ws = await db.query.workspaces.findFirst();
  if (!ws) {
    console.error("No workspace found in DB!");
    return;
  }
  
  console.log("Found workspace:", ws.name, "ID:", ws.id);
  console.log("Current Dodo Customer ID:", ws.dodoCustomerId);

  const email = "test-dodo-customer@example.com";
  const name = "Test Dodo Customer";
  
  console.log("\n1. Testing getOrCreateDodoCustomer mock...");
  let customerId = ws.dodoCustomerId;
  if (!customerId) {
    console.log("Creating customer on Dodo...");
    const customer = await dodo.customers.create({
      email,
      name,
      metadata: { workspaceId: ws.id }
    } as any);
    customerId = (customer as any).customerId || (customer as any).customer_id || (customer as any).id;
    console.log("Created customer ID:", customerId);
  } else {
    console.log("Customer already exists:", customerId);
  }

  console.log("\n2. Testing createCheckoutSession mock for starter plan monthly...");
  const priceId = PLANS.starter.dodoPriceId.monthly;
  console.log("Starter monthly price ID:", priceId);
  
  if (!priceId) {
    console.error("No Starter monthly price ID configured!");
    return;
  }

  const successUrl = "http://localhost:3000/dashboard?billing=success";
  const cancelUrl = "http://localhost:3000/pricing";

  console.log("Calling Dodo checkoutSessions.create...");
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: priceId, quantity: 1 }],
    customer: {
      email,
    },
    return_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { workspaceId: ws.id, userId: ws.ownerId, plan: 'starter', billingCycle: 'monthly' }
  });

  console.log("Checkout session created successfully!");
  console.log("Checkout URL:", session.checkout_url);
}

main().catch(e => {
  console.error("Error during checkout simulation:", e);
});

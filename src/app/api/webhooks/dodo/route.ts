import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import DodoPayments from "dodopayments";

// This requires a valid DODO_PAYMENTS_SECRET_KEY and DODO_PAYMENTS_WEBHOOK_SECRET in .env
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_SECRET_KEY || "",
});

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("webhook-signature") || req.headers.get("dodo-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature provided" }, { status: 400 });
  }

  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("Missing DODO_PAYMENTS_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: any;

  try {
    // Note: DodoPayments signature verification might differ slightly.
    // Ensure you consult their latest docs. Many use standard HMAC SHA256.
    // If the official SDK supports constructEvent, use it.
    event = dodo.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const data = event.data;
  
  switch (event.type) {
    case "subscription.created":
    case "subscription.updated":
      // Assuming metadata contains workspaceId
      if (data.metadata?.workspaceId) {
        const plan = data.plan?.product_id || "pro"; // map to your plan structure appropriately
        
        await db
          .update(workspaces)
          .set({
            plan: plan as any, // 'free' | 'starter' | 'growth' | 'agency' | 'business' | 'enterprise'
            stripeSubscriptionId: data.id,
            stripeCustomerId: data.customer_id,
          })
          .where(eq(workspaces.id, data.metadata.workspaceId));
      }
      break;

    case "subscription.deleted":
    case "subscription.canceled":
      if (data.metadata?.workspaceId) {
        await db
          .update(workspaces)
          .set({
            plan: "free",
            stripeSubscriptionId: null,
          })
          .where(eq(workspaces.id, data.metadata.workspaceId));
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

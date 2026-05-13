// src/app/api/webhooks/dodo/route.ts
// Uses @dodopayments/nextjs Webhooks adapter for signature-verified event handling.
import { Webhooks } from "@dodopayments/nextjs";
import { db } from "@/lib/db";
import { users, workspaces } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { trackUserUpgraded } from "@/lib/posthog";
import { mapProductToPlan, guessPlanFromName } from "@/lib/billing/planMap";

type PlanKey = "free" | "starter" | "growth" | "agency" | "business" | "enterprise";

function getWorkspaceId(data: any): string | undefined {
  // Prefer explicit metadata from checkout
  return (
    (data?.metadata?.workspaceId as string | undefined) ||
    (data?.metadata?.workspace_id as string | undefined) ||
    (data?.subscription?.metadata?.workspaceId as string | undefined) ||
    (data?.subscription?.metadata?.workspace_id as string | undefined)
  );
}

// Fallback when workspaceId isn't present: try matching by customer email
async function findWorkspaceIdByCustomerEmail(data: any): Promise<string | undefined> {
  const email: string | undefined =
    (data?.customer?.email as string | undefined) ||
    (data?.customer_email as string | undefined) ||
    (data?.customer?.email_address as string | undefined);

  if (!email) return undefined;

  const u = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!u) return undefined;

  // Prefer default workspace, else latest created for this user
  const wsDefault = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, u.id),
    orderBy: (w, { desc }) => [desc(w.isDefault)],
  });
  if (wsDefault) return wsDefault.id;

  const wsAny = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, u.id),
    orderBy: (w, { desc }) => [desc(w.createdAt as any)],
  });
  return wsAny?.id;
}

function getPlanFromPayload(data: any): PlanKey {
  const productId =
    (data?.plan?.product_id as string | undefined) ??
    (data?.product_id as string | undefined) ??
    (data?.product?.product_id as string | undefined) ??
    null;

  // Try env-based mapping first
  const mapped = productId ? mapProductToPlan(productId) : undefined;
  if (mapped) return mapped as PlanKey;

  // Fallback: try by product/plan name
  const productName =
    (data?.plan?.name as string | undefined) ??
    (data?.product_name as string | undefined) ??
    (data?.product?.name as string | undefined) ??
    undefined;

  const guessed = guessPlanFromName(productName);
  if (guessed) return guessed as PlanKey;

  // Last resort
  console.warn("[Dodo Webhook] Unable to map product to plan. Set DODO_PLAN_*_PRODUCT_ID env vars.", {
    productId,
    productName,
  });
  return "free";
}

// Helper: extract workspaceId and plan
function extractWorkspaceAndPlan(payload: unknown): {
  workspaceId: string | undefined;
  plan: PlanKey;
} {
  const data = (payload as any)?.data ?? (payload as any);
  const plan = getPlanFromPayload(data);
  const workspaceId = getWorkspaceId(data);
  if (!workspaceId) {
    console.warn("[Dodo Webhook] Missing workspaceId in metadata; pass metadata.workspaceId from checkout.");
  }
  return { workspaceId, plan };
}

export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,

  // subscription.active — new subscriber
  onSubscriptionActive: async (payload) => {
    const data = (payload as any)?.data ?? (payload as any);
    let { workspaceId, plan } = extractWorkspaceAndPlan(payload);

    if (!workspaceId) {
      workspaceId = await findWorkspaceIdByCustomerEmail(data);
      if (!workspaceId) {
        console.warn("[Dodo Webhook][active] Could not resolve workspaceId from metadata or email; skipping update.");
        return;
      }
    }

    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    const fromPlan = (ws?.plan as string | undefined) ?? "free";

    await db.update(workspaces).set({ plan: plan as any }).where(eq(workspaces.id, workspaceId));

    // Also reflect plan on workspace owner user record (optional but helpful for gating UI)
    if (ws?.ownerId) {
      await db.update(users).set({ plan: plan as any }).where(eq(users.id, ws.ownerId));
    }

    if (fromPlan === "free" && plan !== "free") {
      trackUserUpgraded({ fromPlan, toPlan: plan });
    }
  },

  // subscription.updated — plan change, renewal, etc.
  onSubscriptionUpdated: async (payload) => {
    const data = (payload as any)?.data ?? (payload as any);
    let { workspaceId, plan } = extractWorkspaceAndPlan(payload);

    if (!workspaceId) {
      workspaceId = await findWorkspaceIdByCustomerEmail(data);
      if (!workspaceId) {
        console.warn("[Dodo Webhook][updated] Could not resolve workspaceId; skipping update.");
        return;
      }
    }

    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    const fromPlan = (ws?.plan as string | undefined) ?? "free";

    await db.update(workspaces).set({ plan: plan as any }).where(eq(workspaces.id, workspaceId));

    if (ws?.ownerId) {
      await db.update(users).set({ plan: plan as any }).where(eq(users.id, ws.ownerId));
    }

    if (fromPlan === "free" && plan !== "free") {
      trackUserUpgraded({ fromPlan, toPlan: plan });
    }
  },

  // subscription.cancelled — downgrade to free
  onSubscriptionCancelled: async (payload) => {
    const data = (payload as any)?.data ?? (payload as any);
    let { workspaceId } = extractWorkspaceAndPlan(payload);
    if (!workspaceId) {
      workspaceId = await findWorkspaceIdByCustomerEmail(data);
      if (!workspaceId) return;
    }
    await db.update(workspaces).set({ plan: "free" as any }).where(eq(workspaces.id, workspaceId));
  },

  // Optional: log any payloads to aid debugging mapping issues
  onPayload: async (payload) => {
    const data = (payload as any)?.data ?? (payload as any);
    const ws = getWorkspaceId(data);
    const pid =
      data?.plan?.product_id ?? data?.product_id ?? data?.product?.product_id ?? null;
    const pname =
      data?.plan?.name ?? data?.product_name ?? data?.product?.name ?? null;
    console.log("[Dodo Webhook] Received payload", {
      type: (payload as any)?.type,
      workspaceId: ws,
      productId: pid,
      productName: pname,
    });
  },
});

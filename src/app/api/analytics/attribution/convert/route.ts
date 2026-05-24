import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { customerJourneys, attributionResults } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type { Touchpoint, AttributionModel } from "@/types/attribution";
import { calculateAttributionCredits } from "@/lib/attribution/models";

const MODELS: AttributionModel[] = ["first_touch", "last_touch", "linear", "time_decay"];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, event, value, currency, customerId, customerEmail, workspaceId } = body;

    if (!sessionId || !event || !workspaceId) {
      return NextResponse.json({ error: "sessionId, event, and workspaceId are required" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.clerkId, userId),
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: (wm, { eq, and: _and }) =>
        _and(eq(wm.workspaceId, workspaceId), eq(wm.userId, user.id)),
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [journey] = await db
      .select()
      .from(customerJourneys)
      .where(
        and(
          eq(customerJourneys.sessionId, sessionId),
          eq(customerJourneys.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    const touchpoints = (journey.touchpoints || []) as Touchpoint[];
    const conversionValue = parseFloat(value) || 0;
    const now = new Date();

    await db
      .update(customerJourneys)
      .set({
        converted: true,
        conversionValue: conversionValue.toString(),
        conversionEvent: event,
        conversionAt: now,
        customerId: customerId || journey.customerId,
        customerEmail: customerEmail || journey.customerEmail,
        updatedAt: now,
      })
      .where(eq(customerJourneys.id, journey.id));

    // Calculate attribution for all 4 models and persist
    const results: (typeof attributionResults.$inferInsert)[] = [];

    for (const model of MODELS) {
      const credits = calculateAttributionCredits(touchpoints, model, conversionValue);

      for (const [linkId, creditValue] of Object.entries(credits)) {
        const totalCredit = conversionValue > 0 ? creditValue / conversionValue : 0;
        results.push({
          workspaceId,
          journeyId: journey.id,
          linkId,
          model,
          credit: totalCredit.toString(),
          creditValue: creditValue.toString(),
        });
      }
    }

    if (results.length > 0) {
      await db.insert(attributionResults).values(results);
    }

    // Fire webhook for conversion tracking integrations
    try {
      const webhookPayload = {
        type: "conversion.tracked",
        data: {
          sessionId,
          event,
          value: conversionValue,
          currency: currency || "USD",
          customerId: customerId || journey.customerId,
          customerEmail: customerEmail || journey.customerEmail,
          workspaceId,
          touchpointCount: touchpoints.length,
          attributedModels: MODELS,
        },
      };

      const webhookUrl = process.env.CONVERSION_WEBHOOK_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        }).catch((e) => console.error("Conversion webhook fire failed", e));
      }
    } catch {
      // non-blocking
    }

    return NextResponse.json({ ok: true, journeyId: journey.id });
  } catch (err) {
    console.error("Attribution convert error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

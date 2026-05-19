import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { REFERRAL_POINTS } from "@/lib/waitlist";

const ReferralSchema = z.object({
  referralCode: z.string().min(1),
  feature: z.enum(["link-in-bio", "custom-domains"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { referralCode, feature } = ReferralSchema.parse(body);

    const [referrer] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.referralCode, referralCode))
      .limit(1);

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code." },
        { status: 404 }
      );
    }

    await db
      .update(waitlist)
      .set({
        points: referrer.points + REFERRAL_POINTS,
      })
      .where(eq(waitlist.id, referrer.id));

    return NextResponse.json({ success: true, referrer: referrer.referralCode });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues?.[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[POST /api/waitlist/referral]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

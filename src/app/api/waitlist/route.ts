import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  generateReferralCode,
  getPosition,
  getTotalSignups,
  SIGNUP_POINTS,
} from "@/lib/waitlist";

const WaitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  feature: z.enum(["link-in-bio", "custom-domains"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, feature } = WaitlistSchema.parse(body);

    const existing = await db
      .select()
      .from(waitlist)
      .where(and(eq(waitlist.email, email), eq(waitlist.feature, feature)))
      .limit(1);

    if (existing.length > 0) {
      const entry = existing[0];
      const position = await getPosition(feature, entry.createdAt);
      const total = await getTotalSignups(feature);

      return NextResponse.json({
        exists: true,
        entry,
        position,
        total,
      });
    }

    const referralCode = generateReferralCode();
    const [entry] = await db
      .insert(waitlist)
      .values({ email, feature, referralCode, points: SIGNUP_POINTS })
      .returning();

    const position = await getPosition(feature, entry.createdAt);
    const total = await getTotalSignups(feature);

    return NextResponse.json({ entry, position, total });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues?.[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[POST /api/waitlist]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const feature = searchParams.get("feature");

    if (!email || !feature) {
      return NextResponse.json(
        { error: "email and feature query params are required" },
        { status: 400 }
      );
    }

    const [entry] = await db
      .select()
      .from(waitlist)
      .where(and(eq(waitlist.email, email), eq(waitlist.feature, feature)))
      .limit(1);

    if (!entry) {
      return NextResponse.json({ exists: false });
    }

    const position = await getPosition(feature, entry.createdAt);
    const total = await getTotalSignups(feature);

    return NextResponse.json({ exists: true, entry, position, total });
  } catch (err) {
    console.error("[GET /api/waitlist]", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

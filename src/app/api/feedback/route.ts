import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userMessages } from "@/lib/db/schema";
import { z } from "zod";

const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { message } = FeedbackSchema.parse(body);

    await db.insert(userMessages).values({
      userId,
      message,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/feedback]", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}

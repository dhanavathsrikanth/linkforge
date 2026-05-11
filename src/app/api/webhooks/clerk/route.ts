import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; primary: boolean }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const svix_id = req.headers.get("svix-id");
  const svix_ts = req.headers.get("svix-timestamp");
  const svix_sig = req.headers.get("svix-signature");

  if (!svix_id || !svix_ts || !svix_sig) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(secret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_ts,
      "svix-signature": svix_sig,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    if (type === "user.created" || type === "user.updated") {
      const primaryEmail = data.email_addresses.find((e) => e.primary)?.email_address ?? null;

      await db
        .insert(users)
        .values({
          clerkId: data.id,
          email: primaryEmail ?? "",
          name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
          avatar: data.image_url ?? null,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: primaryEmail ?? "",
            name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
            avatar: data.image_url ?? null,
            updatedAt: new Date(),
          },
        });
    }

    if (type === "user.deleted") {
      // Soft-delete or mark inactive — links are retained for analytics
      console.log("[clerk-webhook] user.deleted", data.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clerk-webhook] DB error", err);
    return NextResponse.json({ error: "DB operation failed" }, { status: 500 });
  }
}

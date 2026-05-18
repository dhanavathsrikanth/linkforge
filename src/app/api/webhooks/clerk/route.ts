import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

type ClerkWebhookEvent = {
  type: string;
  data: {
    birthday: string | null;
    created_at: number | null;
    id: string;
    email_addresses: unknown[];
    external_accounts: unknown[];
    external_id: string | null;
    first_name: string | null;
    gender: string | null;
    image_url: string | null;
    last_sign_in_at: number | null;
    last_name: string | null;
    password_enabled: boolean | null;
    phone_numbers: unknown[];
    primary_email_address_id: string | null;
    primary_phone_number_id: string | null;
    primary_web3_wallet_id: string | null;
    private_metadata: Record<string, unknown>;
    profile_image_url: string | null;
    public_metadata: Record<string, unknown>;
    two_factor_enabled: boolean | null;
    unsafe_metadata: Record<string, unknown>;
    updated_at: number | null;
    username: string | null;
    web3_wallets: unknown[];
  };
};

type ClerkEmailAddress = {
  id?: string;
  email_address?: string;
};

function fromClerkTimestamp(value: number | null | undefined) {
  return value ? new Date(value) : null;
}

export async function POST(req: Request) {
  const secret =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET");
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
      const primaryEmail =
        (data.email_addresses as ClerkEmailAddress[]).find(
          (email) => email.id === data.primary_email_address_id
        )?.email_address ??
        (data.email_addresses as ClerkEmailAddress[])[0]?.email_address ??
        "";
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
      const userValues = {
        clerkId: data.id,
        email: primaryEmail,
        name: fullName,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        username: data.username ?? null,
        avatar: data.image_url ?? null,
        profileImageUrl: data.profile_image_url ?? null,
        birthday: data.birthday ?? null,
        gender: data.gender ?? null,
        externalId: data.external_id ?? null,
        primaryEmailAddressId: data.primary_email_address_id ?? null,
        primaryPhoneNumberId: data.primary_phone_number_id ?? null,
        primaryWeb3WalletId: data.primary_web3_wallet_id ?? null,
        passwordEnabled: data.password_enabled ?? null,
        twoFactorEnabled: data.two_factor_enabled ?? null,
        lastSignInAt: fromClerkTimestamp(data.last_sign_in_at),
        clerkCreatedAt: fromClerkTimestamp(data.created_at),
        clerkUpdatedAt: fromClerkTimestamp(data.updated_at),
        emailAddresses: data.email_addresses,
        phoneNumbers: data.phone_numbers,
        externalAccounts: data.external_accounts,
        web3Wallets: data.web3_wallets,
        publicMetadata: data.public_metadata,
        privateMetadata: data.private_metadata,
        unsafeMetadata: data.unsafe_metadata,
      };

      await db
        .insert(users)
        .values(userValues)
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            ...userValues,
            updatedAt: new Date(),
          },
        });

      // Fire welcome email in background — only on first creation
      if (type === "user.created" && primaryEmail) {
        const displayName = fullName || primaryEmail.split("@")[0];
        // setTimeout keeps the webhook response fast
        setTimeout(() => {
          sendWelcomeEmail(primaryEmail, displayName).catch(() => {});
        }, 0);
      }
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

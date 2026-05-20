import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sendWelcomeEmail } from "@/lib/email";

type ClerkWebhookEvent = {
  type: string;
  data: Record<string, any>;
};

type ClerkEmailAddress = {
  id?: string;
  email_address?: string;
};

function fromClerkTimestamp(value: number | null | undefined) {
  return value ? new Date(value) : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40) || "workspace";
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
    // ─── User created/updated ───────────────────────────────
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
          set: { ...userValues, updatedAt: new Date() },
        });

      if (type === "user.created" && primaryEmail) {
        const displayName = fullName || primaryEmail.split("@")[0];
        setTimeout(() => {
          sendWelcomeEmail(primaryEmail, displayName).catch(() => {});
        }, 0);
      }
    }

    if (type === "user.deleted") {
      console.log("[clerk-webhook] user.deleted", data.id);
    }

    // ─── Organization created ───────────────────────────────
    if (type === "organization.created") {
      const orgId = data.id;
      const orgName = data.name || data.slug || "Organization";
      const orgSlug = slugify(data.slug || data.name || "org");

      // Check if a workspace for this org already exists
      const existing = await db.query.workspaces.findFirst({
        where: eq(workspaces.clerkOrgId, orgId),
      });
      if (existing) {
        console.log("[clerk-webhook] workspace already exists for org", orgId);
        return NextResponse.json({ ok: true });
      }

      // Find the creator (owner) of the org
      const createdBy = data.created_by;
      let ownerId: string | undefined;

      if (createdBy) {
        const [dbUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, createdBy))
          .limit(1);
        ownerId = dbUser?.id;
      }

      if (!ownerId) {
        console.warn("[clerk-webhook] No DB user found for org creator", createdBy);
        return NextResponse.json({ error: "Creator not found" }, { status: 200 });
      }

      const slug = `${orgSlug}-${orgId.slice(0, 8)}`;

      await db.insert(workspaces).values({
        name: orgName,
        slug,
        ownerId,
        clerkOrgId: orgId,
        clerkOrgName: orgName,
        isDefault: true,
      });

      console.log("[clerk-webhook] workspace created for org", orgId, orgName);
    }

    // ─── Organization membership created ────────────────────
    if (type === "organizationMembership.created") {
      const orgId = data.organization?.id;
      const clerkUserId = data.public_user_data?.user_id || data.publicUserData?.userId;

      if (!orgId || !clerkUserId) {
        console.warn("[clerk-webhook] Missing orgId or userId in membership.created");
        return NextResponse.json({ ok: true });
      }

      // Find the DB workspace linked to this org
      const [workspace] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.clerkOrgId, orgId))
        .limit(1);

      if (!workspace) {
        console.warn("[clerk-webhook] No workspace found for org", orgId);
        return NextResponse.json({ ok: true });
      }

      // Find the DB user
      const [dbUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkUserId))
        .limit(1);

      if (!dbUser) {
        console.warn("[clerk-webhook] No DB user found for clerk user", clerkUserId);
        return NextResponse.json({ ok: true });
      }

      const role = data.role === "org:admin" ? "admin" : data.role === "org:member" ? "editor" : "viewer";

      // Upsert workspace membership
      await db
        .insert(workspaceMembers)
        .values({
          workspaceId: workspace.id,
          userId: dbUser.id,
          role,
        })
        .onConflictDoUpdate({
          target: [workspaceMembers.workspaceId, workspaceMembers.userId],
          set: { role },
        });

      console.log("[clerk-webhook] member added to workspace", workspace.id, dbUser.id, role);
    }

    // ─── Organization membership deleted ────────────────────
    if (type === "organizationMembership.deleted") {
      const orgId = data.organization?.id;
      const clerkUserId = data.public_user_data?.user_id || data.publicUserData?.userId;

      if (!orgId || !clerkUserId) {
        console.warn("[clerk-webhook] Missing orgId or userId in membership.deleted");
        return NextResponse.json({ ok: true });
      }

      // Find the DB workspace linked to this org
      const [workspace] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.clerkOrgId, orgId))
        .limit(1);

      if (!workspace) {
        return NextResponse.json({ ok: true });
      }

      // Find the DB user
      const [dbUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkUserId))
        .limit(1);

      if (!dbUser) {
        return NextResponse.json({ ok: true });
      }

      // Remove membership
      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, dbUser.id)
          )
        );

      console.log("[clerk-webhook] member removed from workspace", workspace.id, dbUser.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clerk-webhook] DB error", err);
    return NextResponse.json({ error: "DB operation failed" }, { status: 500 });
  }
}

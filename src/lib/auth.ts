import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";
import { users } from "./db";

/**
 * Get the current Clerk user ID (server-side, throws if unauthenticated).
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Get or create the DB user record matching the Clerk session.
 * Safe to call on every request — uses upsert.
 */
export async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? "";
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const userValues = {
    clerkId: clerkUser.id,
    email: primaryEmail,
    name: fullName,
    firstName: clerkUser.firstName ?? null,
    lastName: clerkUser.lastName ?? null,
    username: clerkUser.username ?? null,
    avatar: clerkUser.imageUrl ?? null,
    profileImageUrl: clerkUser.imageUrl ?? null,
    birthday: null,
    gender: null,
    externalId: clerkUser.externalId ?? null,
    primaryEmailAddressId: clerkUser.primaryEmailAddressId ?? null,
    primaryPhoneNumberId: clerkUser.primaryPhoneNumberId ?? null,
    primaryWeb3WalletId: clerkUser.primaryWeb3WalletId ?? null,
    passwordEnabled: clerkUser.passwordEnabled ?? null,
    twoFactorEnabled: clerkUser.twoFactorEnabled ?? null,
    lastSignInAt: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : null,
    clerkCreatedAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : null,
    clerkUpdatedAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt) : null,
    emailAddresses: clerkUser.emailAddresses,
    phoneNumbers: clerkUser.phoneNumbers,
    externalAccounts: clerkUser.externalAccounts,
    web3Wallets: clerkUser.web3Wallets,
    publicMetadata: clerkUser.publicMetadata,
    privateMetadata: clerkUser.privateMetadata,
    unsafeMetadata: clerkUser.unsafeMetadata,
  };

  const [user] = await db
    .insert(users)
    .values(userValues)
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        ...userValues,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

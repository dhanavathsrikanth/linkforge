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

  const [user] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email: primaryEmail,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatar: clerkUser.imageUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: primaryEmail,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

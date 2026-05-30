import { auth } from "@clerk/nextjs/server";

/**
 * Platform admin check (Req 15.3).
 *
 * A user is a platform admin when the `platformAdmin: true` claim is
 * present in their Clerk session metadata. This is set manually in the
 * Clerk dashboard for staff users — not user-controllable.
 *
 * We also accept the literal string `"true"` (Clerk sometimes returns
 * metadata as JSON-encoded strings depending on how it was set).
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.userId) return false;

  // Clerk attaches publicMetadata to the session token only when the
  // session template includes it. Use sessionClaims first; fall back to
  // a direct user lookup if needed.
  const claims = session.sessionClaims as Record<string, unknown> | undefined;
  if (claims?.platformAdmin === true || claims?.platformAdmin === "true") {
    return true;
  }
  const meta = (claims?.publicMetadata ?? claims?.public_metadata) as
    | Record<string, unknown>
    | undefined;
  return meta?.platformAdmin === true || meta?.platformAdmin === "true";
}

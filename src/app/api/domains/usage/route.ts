import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace } from "@/lib/db/workspace";
import { getDomainUsage } from "@/lib/billing/usage";

/**
 * Domain consumption for the dashboard usage panel
 * (custom-domain-assignment Req 21). Reuses getDomainUsage — no new billing math.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  try {
    // Membership check (throws if not a member).
    await resolveUserWorkspace(dbUser.id, workspaceId);
    const usage = await getDomainUsage(workspaceId);
    return NextResponse.json(usage);
  } catch (err) {
    console.error("[GET /api/domains/usage]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

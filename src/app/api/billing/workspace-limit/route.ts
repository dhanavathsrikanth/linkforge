import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { checkUserWorkspaceLimit } from "@/lib/billing/workspace-limits";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const result = await checkUserWorkspaceLimit(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Workspace limit check error:", error);
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

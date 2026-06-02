import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const CF_API = "https://api.cloudflare.com/client/v4";

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  if (!accountId || !token) return null;
  return { accountId, token };
}

const ALLOWED_PATTERNS = [
  /^SELECT\s/i,
  /^WITH\s/i,
];

function isAllowed(sql: string): boolean {
  const trimmed = sql.trim();
  return ALLOWED_PATTERNS.some((p) => p.test(trimmed));
}

type QueryResult = {
  meta: { name: string; type: string }[];
  data: (number | string | null)[][];
  rows: number;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = getConfig();
  if (!config) {
    return NextResponse.json({ error: "Analytics Engine not configured" }, { status: 503 });
  }

  let body: { sql: string; workspaceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sql || !isAllowed(body.sql)) {
    return NextResponse.json({ error: "Only SELECT queries are allowed" }, { status: 403 });
  }

  // Verify workspace access
  if (body.workspaceId) {
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, body.workspaceId)
      ),
    });
    if (!membership) {
      return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
    }
  }

  try {
    const res = await fetch(
      `${CF_API}/accounts/${config.accountId}/analytics_engine/sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "text/plain",
        },
        body: body.sql,
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      return NextResponse.json(
        { error: `Analytics Engine error: ${res.status}`, detail: errText.slice(0, 500) },
        { status: 502 }
      );
    }

    const result: QueryResult = await res.json();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "Query failed", detail: msg }, { status: 500 });
  }
}

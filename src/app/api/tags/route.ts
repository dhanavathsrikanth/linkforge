import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceTags } from "@/lib/db";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { rateLimitByUser } from "@/lib/rate-limiter";
import { and, eq, desc } from "drizzle-orm";

const CreateTagSchema = z.object({
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  name: z.string().min(1).max(50).transform(s => s.toLowerCase().trim()),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a valid hex color").optional(),
  description: z.string().max(200).optional(),
});

// GET /api/tags?workspaceId=...
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);

    const tags = await db
      .select()
      .from(workspaceTags)
      .where(eq(workspaceTags.workspaceId, ws.id))
      .orderBy(desc(workspaceTags.usageCount), desc(workspaceTags.createdAt));

    return NextResponse.json({ tags, workspaceId: ws.id });
  } catch (err) {
    console.error("[GET /api/tags]", err);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST /api/tags
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const rateLimit = await rateLimitByUser(dbUser.id, "create:tag", 30, 60);
    if (rateLimit) return rateLimit;

    const body = await req.json();
    const parsed = CreateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

    // Validate workspace membership and write permission
    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, v.workspaceId);
      if (!canWrite(ws.role)) {
        return NextResponse.json({ error: "You don't have permission to manage tags in this workspace" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    // Check if tag already exists in this workspace
    const [existing] = await db
      .select()
      .from(workspaceTags)
      .where(
        and(
          eq(workspaceTags.workspaceId, ws.id),
          eq(workspaceTags.name, v.name)
        )
      );

    if (existing) {
      return NextResponse.json({ tag: existing });
    }

    const [tag] = await db
      .insert(workspaceTags)
      .values({
        workspaceId: ws.id,
        name: v.name,
        color: v.color ?? "#433BFF",
        description: v.description ?? null,
        usageCount: 0,
      })
      .returning();

    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tags]", err);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

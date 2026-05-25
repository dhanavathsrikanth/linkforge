import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { folders, links } from "@/lib/db";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { rateLimitByUser } from "@/lib/rate-limiter";
import { eq, sql, desc } from "drizzle-orm";

const CreateFolderSchema = z.object({
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(200).nullish(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a valid hex color").nullish(),
  icon: z.string().max(50).nullish(),
});

// GET /api/folders?workspaceId=...
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);

    const folderList = await db
      .select({
        id: folders.id,
        name: folders.name,
        description: folders.description,
        color: folders.color,
        icon: folders.icon,
        workspaceId: folders.workspaceId,
        userId: folders.userId,
        createdAt: folders.createdAt,
        updatedAt: folders.updatedAt,
        linkCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int 
          FROM links 
          WHERE ${links.folderId} = ${folders.id}
        ), 0)`.as("link_count"),
      })
      .from(folders)
      .where(eq(folders.workspaceId, ws.id))
      .orderBy(desc(folders.createdAt));

    return NextResponse.json({ folders: folderList, workspaceId: ws.id });
  } catch (err) {
    console.error("[GET /api/folders]", err);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

// POST /api/folders
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const rateLimit = await rateLimitByUser(dbUser.id, "create:folder", 20, 60);
    if (rateLimit) return rateLimit;

    const body = await req.json();
    const parsed = CreateFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

    // Validate workspace membership and write permission
    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, v.workspaceId);
      if (!canWrite(ws.role)) {
        return NextResponse.json({ error: "You don't have permission to create folders in this workspace" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    const [folder] = await db
      .insert(folders)
      .values({
        workspaceId: ws.id,
        userId: dbUser.id,
        name: v.name,
        description: v.description ?? null,
        color: v.color ?? "#433BFF",
        icon: v.icon ?? "folder",
      })
      .returning();

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/folders]", err instanceof Error ? err.stack || err.message : err);
    return NextResponse.json({
      error: "Failed to create folder",
      detail: process.env.NODE_ENV === "development" ? String(err) : undefined,
    }, { status: 500 });
  }
}

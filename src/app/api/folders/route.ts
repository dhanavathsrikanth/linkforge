import { db, schema } from "@/lib/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const folderList = await db
      .select({
        id: schema.folders.id,
        name: schema.folders.name,
        description: schema.folders.description,
        color: schema.folders.color,
        icon: schema.folders.icon,
        workspaceId: schema.folders.workspaceId,
        userId: schema.folders.userId,
        createdAt: schema.folders.createdAt,
        updatedAt: schema.folders.updatedAt,
        linkCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM links 
          WHERE links.folder_id = folders.id
        )`.as("link_count"),
      })
      .from(schema.folders)
      .where(eq(schema.folders.workspaceId, workspaceId))
      .orderBy(desc(schema.folders.createdAt));

    return NextResponse.json({ folders: folderList });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, name, description, color, icon } = body;

    if (!workspaceId || !name) {
      return NextResponse.json({ error: "workspaceId and name are required" }, { status: 400 });
    }

    const [folder] = await db
      .insert(schema.folders)
      .values({
        workspaceId,
        userId,
        name,
        description: description || null,
        color: color || "#433BFF",
        icon: icon || "folder",
      })
      .returning();

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}

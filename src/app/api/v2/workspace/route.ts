import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, auth.workspaceId),
  });

  if (!workspace) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Workspace not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      logo: workspace.logo,
      createdAt: workspace.createdAt,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot update workspace settings." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const allowedFields = ["name", "logo"];
    const updateData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No valid fields to update." } },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, auth.workspaceId))
      .returning();

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        logo: updated.logo,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/v2/workspace]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update workspace." } },
      { status: 500 }
    );
  }
}

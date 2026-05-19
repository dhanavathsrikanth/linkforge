import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const link = await db.query.links.findFirst({
    where: and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)),
  });

  if (!link) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Link not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: link });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot update links." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await db.query.links.findFirst({
    where: and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)),
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Link not found." } },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const allowedFields = [
      "destination", "title", "description", "tags", "expiresAt",
      "clickLimit", "password", "isActive",
      "utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent",
      "ogTitle", "ogDescription", "ogImage",
      "iosDestination", "androidDestination",
      "abTestEnabled",
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        if (key === "slug") {
          const existingSlug = await db.query.links.findFirst({
            where: and(eq(links.slug, body.slug), eq(links.workspaceId, auth.workspaceId)),
          });
          if (existingSlug && existingSlug.id !== id) {
            return NextResponse.json(
              { error: { code: "CONFLICT", message: "Slug already taken." } },
              { status: 409 }
            );
          }
        }
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No valid fields to update." } },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(links)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(links.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/v2/links/[id]]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update link." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot delete links." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await db.query.links.findFirst({
    where: and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)),
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Link not found." } },
      { status: 404 }
    );
  }

  await db
    .update(links)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(links.id, id));

  return NextResponse.json({ data: { id, deleted: true } });
}

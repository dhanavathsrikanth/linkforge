import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";

const UTMTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  source: z.string().max(120).optional().or(z.literal("")),
  medium: z.string().max(120).optional().or(z.literal("")),
  campaign: z.string().max(120).optional().or(z.literal("")),
  term: z.string().max(120).optional().or(z.literal("")),
  content: z.string().max(120).optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
});

// GET /api/v1/utm-templates?workspaceId=X
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    const templates = workspace?.utmTemplates || [];

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[GET /api/v1/utm-templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/utm-templates
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await request.json();
    const { workspaceId, template } = body;

    if (!workspaceId || !template) {
      return NextResponse.json({ error: "workspaceId and template are required" }, { status: 400 });
    }

    const parsed = UTMTemplateSchema.safeParse(template);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);
    if (!canWrite(ws.role)) {
      return NextResponse.json({ error: "You don't have permission to manage UTM templates" }, { status: 403 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    const currentTemplates = workspace?.utmTemplates || [];
    let newTemplates = currentTemplates;
    if (template.isDefault) {
      newTemplates = currentTemplates.map((t: any) => ({ ...t, isDefault: false }));
    }

    const existingIndex = newTemplates.findIndex((t: any) => t.id === template.id);
    if (existingIndex >= 0) {
      newTemplates[existingIndex] = template;
    } else {
      newTemplates.push(template);
    }

    await db
      .update(workspaces)
      .set({ utmTemplates: newTemplates })
      .where(eq(workspaces.id, workspaceId));

    return NextResponse.json({ templates: newTemplates });
  } catch (error) {
    console.error("[POST /api/v1/utm-templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/v1/utm-templates
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { workspaceId, templateId } = await request.json();

    if (!workspaceId || !templateId) {
      return NextResponse.json({ error: "workspaceId and templateId are required" }, { status: 400 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, workspaceId);
    if (!canWrite(ws.role)) {
      return NextResponse.json({ error: "You don't have permission to manage UTM templates" }, { status: 403 });
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    const currentTemplates = workspace?.utmTemplates || [];
    const newTemplates = currentTemplates.filter((t: any) => t.id !== templateId);

    await db
      .update(workspaces)
      .set({ utmTemplates: newTemplates })
      .where(eq(workspaces.id, workspaceId));

    return NextResponse.json({ templates: newTemplates });
  } catch (error) {
    console.error("[DELETE /api/v1/utm-templates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

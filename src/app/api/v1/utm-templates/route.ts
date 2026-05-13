import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const UTM_TEMPLATE_ID = "utm_template_id";

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

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify workspace ownership
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const templates = workspace.utmTemplates || [];

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

    const body = await request.json();
    const { workspaceId, template } = body;

    if (!workspaceId || !template) {
      return NextResponse.json({ error: "workspaceId and template are required" }, { status: 400 });
    }

    const parsed = UTMTemplateSchema.safeParse(template);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // Verify workspace ownership
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Get current templates
    const currentTemplates = workspace.utmTemplates || [];
    
    // If this template is set as default, unset other defaults
    let newTemplates = currentTemplates;
    if (template.isDefault) {
      newTemplates = currentTemplates.map((t: any) => ({ ...t, isDefault: false }));
    }
    
    // Add or update the template
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

    const { workspaceId, templateId } = await request.json();

    if (!workspaceId || !templateId) {
      return NextResponse.json({ error: "workspaceId and templateId are required" }, { status: 400 });
    }

    // Verify workspace ownership
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Get current templates and remove the one with matching id
    const currentTemplates = workspace.utmTemplates || [];
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
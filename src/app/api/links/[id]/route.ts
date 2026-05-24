import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";
import { sendWebhookEvent } from "@/lib/svix/send";
import { z } from "zod";
import bcrypt from "bcryptjs";

const UpdateLinkSchema = z.object({
  destination: z.string().url().optional(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  password: z.string().max(64).optional().nullable(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  clickLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  utmSource: z.string().max(120).optional().nullable(),
  utmMedium: z.string().max(120).optional().nullable(),
  utmCampaign: z.string().max(120).optional().nullable(),
  utmTerm: z.string().max(120).optional().nullable(),
  utmContent: z.string().max(120).optional().nullable(),
  ogTitle: z.string().max(200).optional().nullable(),
  ogDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  iosDestination: z.string().url().optional().nullable(),
  androidDestination: z.string().url().optional().nullable(),
  abTestEnabled: z.boolean().optional(),
  abTestVariants: z
    .array(
      z.object({
        id: z.string().optional(),
        destination: z.string(),
        weight: z.number().min(1).max(100),
        label: z.string().optional(),
        clicks: z.number().optional(),
        conversions: z.number().optional(),
        conversionRate: z.number().optional(),
        uniqueClicks: z.number().optional(),
      })
    )
    .optional(),
  routingRules: z
    .array(
      z.object({
        condition: z.object({
          device: z.enum(["mobile", "desktop", "tablet"]).optional(),
          country: z.string().optional(),
          language: z.string().optional(),
        }),
        destination: z.string(),
      })
    )
    .optional()
    .nullable(),
  workspaceId: z.string().uuid("Must provide a workspace ID"),
});

function emptyToNull<T extends string | undefined | null>(v: T): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function clean(v: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(v)) {
    if (val !== undefined) out[key] = val === "" ? null : val;
  }
  return out;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, v.workspaceId);
      if (!canWrite(ws.role)) {
        return NextResponse.json({ error: "You don't have permission to edit links in this workspace" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    const existing = await db.query.links.findFirst({
      where: eq(links.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    if (existing.workspaceId !== v.workspaceId) {
      return NextResponse.json({ error: "Link does not belong to this workspace" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    if (v.destination !== undefined) updateData.destination = v.destination;
    if (v.title !== undefined) updateData.title = emptyToNull(v.title);
    if (v.description !== undefined) updateData.description = emptyToNull(v.description);
    if (v.password !== undefined) {
      updateData.password = v.password ? await bcrypt.hash(v.password, 10) : null;
    }
    if (v.tags !== undefined) updateData.tags = v.tags;
    if (v.folderId !== undefined) updateData.folderId = v.folderId;
    if (v.expiresAt !== undefined) updateData.expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
    if (v.scheduledAt !== undefined) updateData.scheduledAt = v.scheduledAt ? new Date(v.scheduledAt) : null;
    if (v.clickLimit !== undefined) updateData.clickLimit = v.clickLimit;
    if (v.isActive !== undefined) updateData.isActive = v.isActive;
    if (v.utmSource !== undefined) updateData.utmSource = emptyToNull(v.utmSource);
    if (v.utmMedium !== undefined) updateData.utmMedium = emptyToNull(v.utmMedium);
    if (v.utmCampaign !== undefined) updateData.utmCampaign = emptyToNull(v.utmCampaign);
    if (v.utmTerm !== undefined) updateData.utmTerm = emptyToNull(v.utmTerm);
    if (v.utmContent !== undefined) updateData.utmContent = emptyToNull(v.utmContent);
    if (v.ogTitle !== undefined) updateData.ogTitle = emptyToNull(v.ogTitle);
    if (v.ogDescription !== undefined) updateData.ogDescription = emptyToNull(v.ogDescription);
    if (v.ogImage !== undefined) updateData.ogImage = emptyToNull(v.ogImage);
    if (v.iosDestination !== undefined) updateData.iosDestination = emptyToNull(v.iosDestination);
    if (v.androidDestination !== undefined) updateData.androidDestination = emptyToNull(v.androidDestination);
    if (v.abTestEnabled !== undefined) updateData.abTestEnabled = v.abTestEnabled;
    if (v.abTestVariants !== undefined) {
      updateData.abTestVariants = v.abTestVariants.map((av) => ({
        id: av.id ?? crypto.randomUUID(),
        destination: av.destination,
        weight: av.weight,
        label: av.label ?? `Variant ${String.fromCharCode(64 + (v.abTestVariants?.indexOf(av) ?? 0) + 1)}`,
        clicks: av.clicks ?? 0,
        conversions: av.conversions ?? 0,
        conversionRate: av.conversionRate ?? 0,
        uniqueClicks: av.uniqueClicks ?? 0,
      }));
    }
    if (v.routingRules !== undefined) updateData.routingRules = v.routingRules;

    const [updated] = await db
      .update(links)
      .set({ ...clean(updateData), updatedAt: new Date() })
      .where(eq(links.id, id))
      .returning();

    logAudit({
      workspaceId: v.workspaceId,
      actorId: dbUser.id,
      action: "update",
      entityType: "link",
      entityId: id,
      metadata: { changed: Object.keys(updateData) },
    });

    sendWebhookEvent({
      eventType: "link.updated",
      workspaceId: v.workspaceId,
      data: { linkId: id, slug: existing.slug, destination: existing.destination, changes: Object.keys(updateData) },
      actorId: dbUser.id,
      idempotencyKey: `link.updated-${id}-${Date.now()}`,
    });

    return NextResponse.json({ link: updated });
  } catch (err) {
    console.error("[PATCH /api/links/[id]]", err);
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const { id } = await params;
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId query param required" }, { status: 400 });
    }

    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, workspaceId);
      if (!canWrite(ws.role)) {
        return NextResponse.json({ error: "You don't have permission to delete links in this workspace" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    const existing = await db.query.links.findFirst({
      where: eq(links.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    if (existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Link does not belong to this workspace" }, { status: 403 });
    }

    await db.delete(links).where(eq(links.id, id));

    logAudit({
      workspaceId,
      actorId: dbUser.id,
      action: "delete",
      entityType: "link",
      entityId: id,
      metadata: { slug: existing.slug, destination: existing.destination },
    });

    sendWebhookEvent({
      eventType: "link.deleted",
      workspaceId,
      data: { linkId: id, slug: existing.slug, destination: existing.destination },
      actorId: dbUser.id,
      idempotencyKey: `link.deleted-${id}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/links/[id]]", err);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}

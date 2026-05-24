import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateLinkSchema = z.object({
  destination: z.string().url().optional(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  slug: z.string().min(2).max(64).optional(),
  tags: z.array(z.string()).optional(),
  password: z.string().max(64).optional().nullable(),
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
  abTestVariants: z.array(z.object({
    id: z.string().optional(),
    destination: z.string(),
    weight: z.number().min(1).max(100),
    label: z.string().optional(),
    clicks: z.number().optional(),
    conversions: z.number().optional(),
    conversionRate: z.number().optional(),
    uniqueClicks: z.number().optional(),
  })).optional(),
  routingRules: z.array(z.object({
    condition: z.object({
      device: z.enum(["mobile", "desktop", "tablet"]).optional(),
      country: z.string().optional(),
      language: z.string().optional(),
    }),
    destination: z.string(),
  })).optional().nullable(),
});

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
    const parsed = UpdateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (v.destination !== undefined) updateData.destination = v.destination;
    if (v.title !== undefined) updateData.title = v.title;
    if (v.description !== undefined) updateData.description = v.description;
    if (v.tags !== undefined) updateData.tags = v.tags;
    if (v.expiresAt !== undefined) updateData.expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
    if (v.scheduledAt !== undefined) updateData.scheduledAt = v.scheduledAt ? new Date(v.scheduledAt) : null;
    if (v.clickLimit !== undefined) updateData.clickLimit = v.clickLimit;
    if (v.isActive !== undefined) updateData.isActive = v.isActive;
    if (v.utmSource !== undefined) updateData.utmSource = v.utmSource;
    if (v.utmMedium !== undefined) updateData.utmMedium = v.utmMedium;
    if (v.utmCampaign !== undefined) updateData.utmCampaign = v.utmCampaign;
    if (v.utmTerm !== undefined) updateData.utmTerm = v.utmTerm;
    if (v.utmContent !== undefined) updateData.utmContent = v.utmContent;
    if (v.ogTitle !== undefined) updateData.ogTitle = v.ogTitle;
    if (v.ogDescription !== undefined) updateData.ogDescription = v.ogDescription;
    if (v.ogImage !== undefined) updateData.ogImage = v.ogImage;
    if (v.iosDestination !== undefined) updateData.iosDestination = v.iosDestination;
    if (v.androidDestination !== undefined) updateData.androidDestination = v.androidDestination;
    if (v.abTestEnabled !== undefined) updateData.abTestEnabled = v.abTestEnabled;
    if (v.routingRules !== undefined) updateData.routingRules = v.routingRules;

    if (v.slug !== undefined) {
      const existingSlug = await db.query.links.findFirst({
        where: and(eq(links.slug, v.slug), eq(links.workspaceId, auth.workspaceId)),
      });
      if (existingSlug && existingSlug.id !== id) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Slug already taken." } },
          { status: 409 }
        );
      }
      updateData.slug = v.slug;
    }

    if (v.password !== undefined) {
      updateData.password = v.password ? await bcrypt.hash(v.password, 10) : null;
    }

    if (v.abTestVariants !== undefined) {
      updateData.abTestVariants = v.abTestVariants.map((av) => ({
        id: av.id ?? crypto.randomUUID(),
        destination: av.destination,
        weight: av.weight,
        label: av.label ?? `Variant ${String.fromCharCode(64 + (v.abTestVariants!.indexOf(av) ?? 0) + 1)}`,
        clicks: av.clicks ?? 0,
        conversions: av.conversions ?? 0,
        conversionRate: av.conversionRate ?? 0,
        uniqueClicks: av.uniqueClicks ?? 0,
      }));
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

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
  slug: z.string().min(2).max(64).optional(),
  tags: z.array(z.string()).optional(),
  password: z.string().max(64).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  clickLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  utm: z.object({
    source: z.string().max(120).optional(),
    medium: z.string().max(120).optional(),
    campaign: z.string().max(120).optional(),
    term: z.string().max(120).optional(),
    content: z.string().max(120).optional(),
  }).optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variants: z.array(z.object({
      destination: z.string(),
      weight: z.number().min(1).max(100),
      label: z.string(),
    })),
  }).optional(),
  smartRouting: z.object({
    ios: z.string().url().optional(),
    android: z.string().url().optional(),
    geo: z.record(z.string(), z.string()).optional(),
  }).optional(),
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
    if (v.tags !== undefined) updateData.tags = v.tags;
    if (v.expiresAt !== undefined) updateData.expiresAt = v.expiresAt ? new Date(v.expiresAt) : null;
    if (v.clickLimit !== undefined) updateData.clickLimit = v.clickLimit;
    if (v.isActive !== undefined) updateData.isActive = v.isActive;

    if (v.utm) {
      if (v.utm.source !== undefined) updateData.utmSource = v.utm.source;
      if (v.utm.medium !== undefined) updateData.utmMedium = v.utm.medium;
      if (v.utm.campaign !== undefined) updateData.utmCampaign = v.utm.campaign;
      if (v.utm.term !== undefined) updateData.utmTerm = v.utm.term;
      if (v.utm.content !== undefined) updateData.utmContent = v.utm.content;
    }

    if (v.smartRouting) {
      if (v.smartRouting.ios !== undefined) updateData.iosDestination = v.smartRouting.ios;
      if (v.smartRouting.android !== undefined) updateData.androidDestination = v.smartRouting.android;
      if (v.smartRouting.geo !== undefined) updateData.geoRouting = v.smartRouting.geo;
    }

    if (v.abTest !== undefined) {
      updateData.abTestEnabled = v.abTest.enabled;
      if (v.abTest.variants) {
        updateData.abTestVariants = v.abTest.variants.map((av, i) => ({
          id: crypto.randomUUID(),
          destination: av.destination,
          weight: av.weight,
          label: av.label || `Variant ${String.fromCharCode(65 + i)}`,
          clicks: 0,
          conversions: 0,
          conversionRate: 0,
          uniqueClicks: 0,
        }));
      }
    }

    if (v.slug !== undefined) {
      const slugExists = await db.query.links.findFirst({
        where: and(eq(links.slug, v.slug), eq(links.workspaceId, auth.workspaceId)),
      });
      if (slugExists && slugExists.id !== id) {
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
    console.error("[PATCH /api/v1/links/[id]]", err);
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

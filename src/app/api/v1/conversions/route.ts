import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversions, links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const TrackConversionSchema = z.object({
  linkId: z.string().uuid(),
  event: z.string().min(1).max(100),
  value: z.number().positive().optional(),
  currency: z.string().length(3).optional().default("USD"),
  abVariant: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
  customerId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot track conversions." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = TrackConversionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const v = parsed.data;

    const link = await db.query.links.findFirst({
      where: and(eq(links.id, v.linkId), eq(links.workspaceId, auth.workspaceId)),
    });

    if (!link) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Link not found." } },
        { status: 404 }
      );
    }

    await db.insert(conversions).values({
      linkId: v.linkId,
      workspaceId: auth.workspaceId,
      event: v.event,
      value: v.value?.toString() ?? null,
      currency: v.currency || "USD",
      abVariant: v.abVariant ?? null,
      metadata: v.metadata ?? null,
    });

    return NextResponse.json({ data: { success: true } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/conversions]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to track conversion." } },
      { status: 500 }
    );
  }
}

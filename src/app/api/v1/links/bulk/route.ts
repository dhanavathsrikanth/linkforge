import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const BulkCreateSchema = z.object({
  links: z.array(z.object({
    destination: z.string().url(),
    slug: z.string().min(2).max(64).optional(),
    title: z.string().max(200).optional(),
    tags: z.array(z.string()).optional(),
  })).min(1).max(100),
});

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.mode === "read-only") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Publishable API keys cannot create links." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = BulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.flatten() } },
        { status: 422 }
      );
    }

    const created: unknown[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < parsed.data.links.length; i++) {
      const item = parsed.data.links[i]!;
      const slug = item.slug?.trim() || nanoid(7);

      try {
        const existing = await db.query.links.findFirst({
          where: (l, { eq }) => eq(l.slug, slug),
        });
        if (existing) {
          errors.push({ index: i, error: `Slug "${slug}" already taken.` });
          continue;
        }

        const [link] = await db
          .insert(links)
          .values({
            workspaceId: auth.workspaceId,
            slug,
            destination: item.destination,
            title: item.title ?? null,
            tags: item.tags ?? [],
          })
          .returning();

        created.push(link);
      } catch (err) {
        errors.push({ index: i, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return NextResponse.json({
      data: created,
      meta: { total: parsed.data.links.length, created: created.length, errors: errors.length },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/links/bulk]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to bulk create links." } },
      { status: 500 }
    );
  }
}

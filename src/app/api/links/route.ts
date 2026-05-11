import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional(),
  title: z.string().max(120).optional(),
  password: z.string().max(64).optional(),
  tags: z.string().max(256).optional(),
  expiresAt: z.string().datetime().optional(),
  workspaceId: z.string().uuid("Must provide a workspace ID"),
});

// GET /api/links — list user's links
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userLinks = await db.query.links.findMany({
      where: (l, { eq }) => eq(l.userId, userId),
      orderBy: (l, { desc }) => [desc(l.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ links: userLinks });
  } catch (err) {
    console.error("[GET /api/links]", err);
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}

// POST /api/links — create a new short link
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { destination, slug: customSlug, title, expiresAt, workspaceId, password, tags } = parsed.data;
    const slug = customSlug || nanoid(7);

    // Hash password if provided
    let hashedPassword = null;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Process tags
    const tagsArray = tags 
      ? tags.split(",").map(t => t.trim()).filter(t => t !== "")
      : [];

    // Check slug uniqueness
    const existing = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.slug, slug),
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }

    const [link] = await db
      .insert(links)
      .values({
        userId,
        workspaceId,
        slug,
        destination,
        title: title ?? null,
        password: hashedPassword,
        tags: tagsArray,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    // Cache in Redis for edge worker
    await redis.set(`link:${slug}`, destination, { ex: 60 * 60 * 24 * 30 });

    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/links]", err);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

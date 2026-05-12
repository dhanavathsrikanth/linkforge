import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getOrCreateDbUser } from "@/lib/auth";

const CreateLinkSchema = z.object({
  destination: z.string().url("Must be a valid URL"),
  slug: z.string().min(2).max(64).optional().or(z.literal("")),
  title: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  password: z.string().max(64).optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  clickLimit: z.number().int().positive().optional().nullable(),
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  utmSource: z.string().max(120).optional().or(z.literal("")),
  utmMedium: z.string().max(120).optional().or(z.literal("")),
  utmCampaign: z.string().max(120).optional().or(z.literal("")),
  utmTerm: z.string().max(120).optional().or(z.literal("")),
  utmContent: z.string().max(120).optional().or(z.literal("")),
  ogTitle: z.string().max(200).optional().or(z.literal("")),
  ogDescription: z.string().max(500).optional().or(z.literal("")),
  ogImage: z.string().url().optional().or(z.literal("")),
  iosDestination: z.string().url().optional().or(z.literal("")),
  androidDestination: z.string().url().optional().or(z.literal("")),
});

function emptyToNull<T extends string | undefined | null>(v: T): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

// GET /api/links — list user's links (in their workspaces)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const userLinks = await db.query.links.findMany({
      where: (l, { eq }) => eq(l.userId, dbUser.id),
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
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;
    const slug = (v.slug && v.slug.trim().length > 0) ? v.slug.trim() : nanoid(7);

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (v.password && v.password.trim() !== "") {
      hashedPassword = await bcrypt.hash(v.password, 10);
    }

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
        userId: dbUser.id,
        workspaceId: v.workspaceId,
        slug,
        destination: v.destination,
        title: emptyToNull(v.title),
        description: emptyToNull(v.description),
        tags: v.tags ?? [],
        password: hashedPassword,
        expiresAt: v.expiresAt && v.expiresAt !== "" ? new Date(v.expiresAt) : null,
        clickLimit: v.clickLimit ?? null,
        utmSource: emptyToNull(v.utmSource),
        utmMedium: emptyToNull(v.utmMedium),
        utmCampaign: emptyToNull(v.utmCampaign),
        utmTerm: emptyToNull(v.utmTerm),
        utmContent: emptyToNull(v.utmContent),
        ogTitle: emptyToNull(v.ogTitle),
        ogDescription: emptyToNull(v.ogDescription),
        ogImage: emptyToNull(v.ogImage),
        iosDestination: emptyToNull(v.iosDestination),
        androidDestination: emptyToNull(v.androidDestination),
      })
      .returning();

    // Cache in Redis for edge worker (best-effort)
    try {
      await redis.set(`link:${slug}`, v.destination, { ex: 60 * 60 * 24 * 30 });
    } catch (cacheErr) {
      console.warn("[POST /api/links] redis cache failed", cacheErr);
    }

    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/links]", err);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}

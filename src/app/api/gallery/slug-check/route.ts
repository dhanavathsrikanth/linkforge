import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/gallery/slug-check?slug=foo
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false, error: "Slug too short" });
  }

  if (!/^[a-z0-9-_]+$/.test(slug)) {
    return NextResponse.json({ available: false, error: "Only lowercase letters, numbers, hyphens, and underscores" });
  }

  try {
    const existing = await db.query.linkGallery.findFirst({
      where: (g, { eq }) => eq(g.slug, slug),
    });
    return NextResponse.json({ available: !existing });
  } catch (err) {
    console.error("[GET /api/gallery/slug-check]", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

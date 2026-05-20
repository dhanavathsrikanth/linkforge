import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 1) {
    return new Response(null, { status: 404 });
  }

  try {
    const link = await db.query.links.findFirst({
      where: (l, { eq, and, isNull }) =>
        and(eq(l.slug, slug), isNull(l.domainId)),
    });

    if (!link || !link.isActive) {
      return new Response(null, { status: 404 });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return new Response(null, { status: 410 });
    }

    if (link.clickLimit !== null && link.totalClicks >= link.clickLimit) {
      return new Response(null, { status: 410 });
    }

    if (link.password) {
      return NextResponse.redirect(
        new URL(`/protected?id=${link.id}`, _req.url)
      );
    }

    return NextResponse.redirect(link.destination, { status: 302 });
  } catch {
    return new Response(null, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  
  // Basic internal auth
  const secret = req.headers.get("x-worker-secret");
  if (secret !== "internal") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.slug, slug),
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json(link);
  } catch (err) {
    console.error("[GET /api/links/resolve]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { slug, password } = await req.json();

    if (!slug || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const link = await db.query.links.findFirst({
      where: (l, { eq }) => eq(l.slug, slug),
    });

    if (!link || !link.password) {
      return NextResponse.json({ error: "Link not found or not protected" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, link.password);

    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Set cookie for the worker to see
    // Valid for 24 hours
    const cookieStore = await cookies();
    cookieStore.set(`pw_auth_${slug}`, "true", {
      maxAge: 60 * 60 * 24,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/links/verify-password]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

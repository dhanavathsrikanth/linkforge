import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Internal endpoint called by the Cloudflare Worker to resolve a link.
 * Tries to match by domain text first, then falls back to links with no domain.
 *
 * GET /api/internal/links?domain=example.com&slug=abc123
 */
export async function GET(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") ?? "").toLowerCase();
  const slug   = searchParams.get("slug")   ?? "";

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    // First: try to find a link whose custom domain matches
    let link = await db.query.links.findFirst({
      where: (l, { eq, and, isNotNull }) =>
        and(
          eq(l.slug, slug),
          isNotNull(l.domainId)
        ),
      with: {
        domain: true,
      },
    });

    // If found, verify the domain text matches
    if (link && (link as any).domain?.domain?.toLowerCase() !== domain) {
      link = undefined;
    }

    // Fallback: find link without custom domain (default linkforge.app domain)
    if (!link) {
      link = await db.query.links.findFirst({
        where: (l, { eq, and, isNull }) =>
          and(eq(l.slug, slug), isNull(l.domainId)),
      }) as any;
    }

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Shape the response to match what the worker's LinkData type expects
    const shaped = {
      id: link.id,
      slug: link.slug,
      domain: (link as any).domain?.domain ?? null,
      destination: link.destination,
      isActive: link.isActive,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      // schema uses clickLimit, worker calls it expiresAfterClicks
      expiresAfterClicks: link.clickLimit ?? null,
      totalClicks: link.totalClicks,
      password: link.password ?? null,
      routingRules: null, // extend schema if you add routingRules column
      abTestEnabled: link.abTestEnabled,
      // schema uses abTestVariants, worker calls it abVariants
      abVariants: link.abTestVariants ?? null,
      workspaceId: link.workspaceId,
    };

    return NextResponse.json(shaped);
  } catch (err) {
    console.error("[GET /api/internal/links]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

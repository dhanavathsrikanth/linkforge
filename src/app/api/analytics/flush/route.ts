import { NextResponse } from "next/server";

/**
 * POST /api/analytics/flush
 *
 * DEPRECATED — Cloudflare Queues now write analytics directly to Redis.
 * This endpoint is kept for backward compatibility; it's a no-op.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.INTERNAL_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    flushed: 0,
    message: "Analytics are now processed via Cloudflare Queues. This endpoint is deprecated.",
  });
}

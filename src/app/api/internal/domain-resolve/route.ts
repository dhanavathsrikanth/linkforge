import { NextResponse } from "next/server";
import { buildDomainConfig } from "@/lib/domains/config-sync";

/**
 * Worker cache-miss warming endpoint (custom-domain-assignment Req 5.3).
 * The worker calls this when `domain:{host}` is absent in KV; it returns the
 * DB-derived DomainConfig (or null) which the worker caches for 60s.
 *
 * Worker-secret protected — never called by browsers.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const host = (searchParams.get("host") ?? "").toLowerCase();
  if (!host) {
    return NextResponse.json({ error: "Missing host" }, { status: 400 });
  }

  try {
    const config = await buildDomainConfig(host);
    return NextResponse.json(config); // null when unknown/unverified
  } catch (err) {
    console.error("[GET /api/internal/domain-resolve]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

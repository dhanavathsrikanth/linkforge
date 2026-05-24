import { NextResponse } from "next/server";
import { svix } from "@/lib/svix/client";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    const apps = await svix.application.list({ limit: 1 });
    checks.svix = apps.data ? "ok" : "error";
  } catch (err) {
    checks.svix = err instanceof Error ? err.message : "unknown error";
  }

  const healthy = checks.svix === "ok";

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}

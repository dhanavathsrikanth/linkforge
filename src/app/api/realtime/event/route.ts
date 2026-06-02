import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * DEPRECATED — Real-time events now flow through Cloudflare Durable Objects WebSockets.
 * 
 * The old Redis pub/sub system never worked because Upstash Redis REST does not support
 * client-side subscriptions. This endpoint is kept for backward compatibility but is a no-op.
 * 
 * Real-time presence: WorkspacePresence DO WebSocket (/do/presence/workspace:{id}/ws)
 * Real-time data: React Query polling (30s refetchInterval) in LinksDashboardClient
 */
export async function POST(req: NextRequest) {
  // No-op: real-time events now use DO WebSockets + React Query polling
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ success: true, event: body, deprecated: true });
}

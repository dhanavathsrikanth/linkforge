import { NextResponse } from "next/server";

const DO_BASE = process.env.DO_BASE_URL || "http://do";

export async function POST(request: Request) {
  const body = await request.json();
  const { workspaceId } = body;
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const res = await fetch(`${DO_BASE}/do/event-log/${workspaceId}/append`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 201 : 500 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const res = await fetch(`${DO_BASE}/do/event-log/${workspaceId}/list?workspaceId=${workspaceId}&limit=100`);
  const data = await res.json();
  return NextResponse.json(data);
}

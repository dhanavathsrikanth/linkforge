import { type NextRequest } from "next/server";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/ingest", "");
  const search = req.nextUrl.search;
  const url = `${POSTHOG_HOST}${path}${search}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/ingest", "");
  const search = req.nextUrl.search;
  const url = `${POSTHOG_HOST}${path}${search}`;

  const body = await req.blob();
  const contentType = req.headers.get("content-type") || "text/plain";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
    },
    body,
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

import { type NextRequest } from "next/server";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function stripEncodingHeaders(headers: Headers): Headers {
  const h = new Headers(headers);
  h.delete("content-encoding");
  h.delete("transfer-encoding");
  h.delete("content-length");
  return h;
}

async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/ingest", "");
  const search = req.nextUrl.search;
  const url = `${POSTHOG_HOST}${path}${search}`;

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.blob();
  const contentType = req.headers.get("content-type") || undefined;

  const res = await fetch(url, {
    method: req.method,
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: stripEncodingHeaders(res.headers),
  });
}

export const GET = proxy;
export const POST = proxy;

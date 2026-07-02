import { clerkMiddleware } from "@clerk/nextjs/server";
import { sanitizeRedirectUrl } from "@/lib/utils";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/api/webhooks",
  "/p/",
  "/s/",
  "/api/links/resolve",
  "/api/internal",
  "/api/v2",
  "/api/v1",
  "/api/bio/",
  "/api/gallery/assets/",
  "/api/workspaces/current",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/docs" || pathname === "/pricing") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

const VERCEL_HOST = "pivoturl.vercel.app";
const PRODUCTION_HOST = "pivoturl.com";

function fixClerkRedirect(response: Response | null | undefined): Response | null | undefined {
  if (!response || response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get("Location");
  if (!location) return response;
  let url: URL;
  try { url = new URL(location); } catch { return response; }
  if (!url.hostname.endsWith("clerk.pivoturl.com")) return response;
  const redirectUrl = url.searchParams.get("redirect_url");
  if (!redirectUrl) return response;
  const fixed = redirectUrl.replace(VERCEL_HOST, PRODUCTION_HOST);
  if (fixed === redirectUrl) return response;
  url.searchParams.set("redirect_url", fixed);
  return NextResponse.redirect(url.toString(), { status: response.status });
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req.nextUrl.pathname)) return;

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    // Server actions (POST with next-action header) must not be redirected.
    // Let them pass through so the action handler can return a proper error.
    if (
      req.nextUrl.pathname.startsWith("/api") ||
      req.headers.has("next-action")
    ) {
      return new Response("Unauthorized", { status: 401 });
    }
    return redirectToSignIn({ returnBackUrl: sanitizeRedirectUrl(req.url) });
  }
});

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const result = await clerkHandler(req, event);
  return result instanceof Response ? fixClerkRedirect(result) : result;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

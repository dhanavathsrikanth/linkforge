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

// Clerk middleware generates handshake redirects with redirect_url pointing
// back to the Vercel preview host (because the Worker proxies pivoturl.com →
// pivoturl.vercel.app).  Intercept those redirects and rewrite the redirect_url
// so the user lands on the correct domain after the handshake completes.
function fixClerkRedirect(response: Response | null | undefined): Response | null | undefined {
  if (!response || response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get("Location");
  if (!location) return response;
  const url = new URL(location);
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
    if (req.nextUrl.pathname.startsWith("/api")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return redirectToSignIn({ returnBackUrl: sanitizeRedirectUrl(req.url) });
  }
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const result = await clerkHandler(req, event);
  return result instanceof Response ? fixClerkRedirect(result) : result;
}

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

import { clerkMiddleware } from "@clerk/nextjs/server";

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

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req.nextUrl.pathname)) return;

  const { userId, redirectToSignIn } = await auth();

  // For APIs: return 401. For pages: redirect to sign-in preserving return url.
  if (!userId) {
    if (req.nextUrl.pathname.startsWith("/api")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return redirectToSignIn({ returnBackUrl: req.url });
  }
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

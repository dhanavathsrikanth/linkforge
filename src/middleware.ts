import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",     // Dodo & Clerk webhooks (must stay public)
  "/p/(.*)",
  "/s/(.*)",
  "/api/links/resolve(.*)",
  "/api/internal(.*)",
  "/api/v2(.*)",           // v2 routes handle auth internally (API keys or Clerk)
  "/api/v1(.*)",           // v1 routes handle auth internally (API keys or Clerk)
  "/api/bio/(.*)",         // Bio reactions, analytics track, public data — handlers do their own auth
  "/api/gallery/assets/(.*)", // Gallery asset images served on bio pages (public, no auth)
  "/api/workspaces/current", // WorkspaceProvider fetches this client-side; route handler does its own auth
  "/docs",                 // Public API documentation
  "/pricing",              // Public pricing page
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

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

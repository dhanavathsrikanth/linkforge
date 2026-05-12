import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./redis";

// Rate limiting configurations for different endpoints
export const rateLimitConfigs = {
  // API endpoints
  api: {
    general: { limit: 100, window: 60 }, // 100 requests per minute
    auth: { limit: 5, window: 60 }, // 5 auth requests per minute
    links: { limit: 50, window: 60 }, // 50 link operations per minute
  },
  // User actions
  user: {
    createLink: { limit: 10, window: 60 }, // 10 links created per minute
    updateLink: { limit: 30, window: 60 }, // 30 link updates per minute
    deleteLink: { limit: 20, window: 60 }, // 20 link deletions per minute
  },
  // Global limits
  global: {
    signup: { limit: 3, window: 3600 }, // 3 signups per hour
    passwordReset: { limit: 3, window: 3600 }, // 3 password resets per hour
  },
};

// Helper function to get client IP address from NextRequest
function getClientIP(request: NextRequest): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip"); // Cloudflare
  const xClientIP = request.headers.get("x-client-ip");
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }
  
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  if (xClientIP) return xClientIP;
  
  return "unknown";
}

// Rate limiting middleware for API routes
export async function rateLimitMiddleware(
  request: NextRequest,
  config: { limit: number; window: number },
  identifier?: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number } | NextResponse> {
  // Get identifier from IP address, user ID, or custom identifier
  const ip = getClientIP(request);
  const key = identifier ? `rate-limit:${identifier}` : `rate-limit:${ip}:${request.nextUrl.pathname}`;
  
  const result = await checkRateLimit(key, config.limit, config.window);
  
  if (!result.allowed) {
    return NextResponse.json(
      { 
        error: "Rate limit exceeded",
        message: `Too many requests. Try again in ${Math.ceil((result.resetTime - Math.floor(Date.now() / 1000)) / 60)} minutes.`,
        remaining: result.remaining,
        resetTime: result.resetTime,
      },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": config.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetTime.toString(),
          "Retry-After": (result.resetTime - Math.floor(Date.now() / 1000)).toString(),
        },
      }
    );
  }
  
  return result;
}

// Specific rate limiters for common use cases
export const rateLimiters = {
  // General API rate limiter
  api: async (request: NextRequest, identifier?: string) => {
    return rateLimitMiddleware(request, rateLimitConfigs.api.general, identifier);
  },
  
  // Authentication rate limiter
  auth: async (request: NextRequest, identifier?: string) => {
    return rateLimitMiddleware(request, rateLimitConfigs.api.auth, identifier);
  },
  
  // Link creation rate limiter
  createLink: async (request: NextRequest, userId: string) => {
    return rateLimitMiddleware(request, rateLimitConfigs.user.createLink, `user:${userId}`);
  },
  
  // Signup rate limiter
  signup: async (request: NextRequest, email?: string) => {
    const identifier = email || getClientIP(request) || "unknown";
    return rateLimitMiddleware(request, rateLimitConfigs.global.signup, `signup:${identifier}`);
  },
  
  // Password reset rate limiter
  passwordReset: async (request: NextRequest, email?: string) => {
    const identifier = email || getClientIP(request) || "unknown";
    return rateLimitMiddleware(request, rateLimitConfigs.global.passwordReset, `reset:${identifier}`);
  },
};

// Helper function to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", resetTime.toString());
  
  return response;
}

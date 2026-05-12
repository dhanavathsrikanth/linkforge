import { NextRequest, NextResponse } from "next/server";
import { rateLimiters, addRateLimitHeaders } from "@/lib/rate-limiter";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.api(request);
  
  // If rate limit exceeded, return the error response
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  // Rate limit passed - continue with the API logic
  try {
    // Example: Get some data from cache or fetch fresh
    const cacheKey = "example:data";
    const cachedData = await redis.get(cacheKey);
    
    let data;
    if (cachedData && typeof cachedData === 'string') {
      try {
        data = JSON.parse(cachedData);
        console.log("Serving from cache");
      } catch (parseError) {
        console.error("Cache parse error:", parseError);
        data = null; // Force fresh fetch
      }
    }
    
    if (!data) {
      // Simulate fetching fresh data
      data = {
        message: "Hello from rate-limited API!",
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substr(2, 9),
      };
      
      // Cache for 5 minutes
      try {
        await redis.set(cacheKey, JSON.stringify(data));
        await redis.expire(cacheKey, 300);
        console.log("Fetched fresh data and cached");
      } catch (cacheError) {
        console.error("Cache set error:", cacheError);
      }
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      data,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });
    
    // Add rate limit headers
    return addRateLimitHeaders(
      response,
      100, // limit
      rateLimitResult.remaining,
      rateLimitResult.resetTime
    );
    
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Apply stricter rate limiting for POST requests
  const rateLimitResult = await rateLimiters.auth(request);
  
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  try {
    const body = await request.json();
    
    // Example: Store some data in Redis
    const { key, value, ttl = 3600 } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }
    
    // Store data with TTL
    await redis.setex(key, ttl, JSON.stringify(value));
    
    const response = NextResponse.json({
      success: true,
      message: "Data stored successfully",
      key,
      ttl,
    });
    
    return addRateLimitHeaders(
      response,
      5, // stricter limit for POST
      rateLimitResult.remaining,
      rateLimitResult.resetTime
    );
    
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

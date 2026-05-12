import { Redis } from "@upstash/redis";

// Create Redis instance using environment variables
export const redis = Redis.fromEnv();

// Helper function to test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis connection failed:", error);
    return false;
  }
}

// Helper function for rate limiting (common use case)
export async function checkRateLimit(
  key: string, 
  limit: number, 
  window: number // in seconds
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Get current count
    const current = await redis.get(key);
    const count = current && typeof current === 'string' ? parseInt(current, 10) : 0;
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + window,
      };
    }
    
    // Increment counter
    const newCount = count + 1;
    await redis.set(key, newCount.toString());
    await redis.expire(key, window);
    
    return {
      allowed: true,
      remaining: limit - newCount,
      resetTime: now + window,
    };
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: Math.floor(Date.now() / 1000) + window,
    };
  }
}

// Helper function for caching
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600 // 1 hour default
): Promise<T> {
  try {
    // Try to get cached data
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached as string);
    }
    
    // Fetch fresh data
    const data = await fetcher();
    
    // Cache the data using set with expire
    await redis.set(key, JSON.stringify(data));
    if (ttl > 0) {
      await redis.expire(key, ttl);
    }
    
    return data;
  } catch (error) {
    console.error("Cache error:", error);
    // Return fresh data if cache fails
    return await fetcher();
  }
}

// Helper function for session storage
export async function setSessionData(
  sessionId: string,
  data: Record<string, any>,
  ttl: number = 86400 // 24 hours default
): Promise<void> {
  try {
    await redis.set(`session:${sessionId}`, JSON.stringify(data));
    if (ttl > 0) {
      await redis.expire(`session:${sessionId}`, ttl);
    }
  } catch (error) {
    console.error("Session storage error:", error);
  }
}

export async function getSessionData(sessionId: string): Promise<Record<string, any> | null> {
  try {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data as string) : null;
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }
}

export async function deleteSessionData(sessionId: string): Promise<void> {
  try {
    await redis.del(`session:${sessionId}`);
  } catch (error) {
    console.error("Session deletion error:", error);
  }
}

// Development helper
if (process.env.NODE_ENV === "development") {
  // Test connection on startup in development
  testRedisConnection().then((connected) => {
    if (connected) {
      console.log("✅ Redis connection established");
    } else {
      console.warn("⚠️ Redis connection failed - some features may not work");
    }
  });
}

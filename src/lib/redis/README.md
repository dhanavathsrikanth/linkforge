# Upstash Redis Configuration for LinkForge

This document explains how Upstash Redis is configured and used throughout the LinkForge application.

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Setup

The Redis client is configured in `src/lib/redis.ts` using the recommended `Redis.fromEnv()` approach:

```typescript
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();
```

## Available Features

### 1. Basic Redis Operations

```typescript
import { redis } from "@/lib/redis";

// Basic operations
await redis.set("key", "value");
await redis.get("key");
await redis.del("key");

// With expiration
await redis.setex("key", 3600, "value"); // 1 hour TTL

// Lists
await redis.lpush("list", "item1", "item2");
await redis.rpop("list");

// Sets
await redis.sadd("set", "member1", "member2");
await redis.smembers("set");

// Hashes
await redis.hset("hash", "field1", "value1");
await redis.hget("hash", "field1");
```

### 2. Rate Limiting

Built-in rate limiting for API endpoints:

```typescript
import { rateLimiters } from "@/lib/rate-limiter";

// In API route
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimiters.api(request);
  
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult; // Rate limit exceeded
  }
  
  // Continue with your API logic
}
```

Available rate limiters:
- `rateLimiters.api()` - General API (100 req/min)
- `rateLimiters.auth()` - Authentication (5 req/min)
- `rateLimiters.createLink(userId)` - Link creation (10 req/min)
- `rateLimiters.signup(email)` - User signup (3/hour)
- `rateLimiters.passwordReset(email)` - Password reset (3/hour)

### 3. Caching

Automatic caching with fallback:

```typescript
import { getCachedData } from "@/lib/redis";

const data = await getCachedData(
  "cache-key",
  async () => {
    // Fetch fresh data
    return await fetchFromDatabase();
  },
  3600 // 1 hour TTL
);
```

### 4. Session Management

Store and retrieve session data:

```typescript
import { setSessionData, getSessionData, deleteSessionData } from "@/lib/redis";

// Store session
await setSessionData("session-123", { userId: "user-456", role: "admin" });

// Get session
const session = await getSessionData("session-123");

// Delete session
await deleteSessionData("session-123");
```

## Use Cases in LinkForge

### 1. Link Analytics Caching

```typescript
// Cache link analytics for 5 minutes
const analytics = await getCachedData(
  `analytics:${linkId}`,
  async () => await fetchLinkAnalytics(linkId),
  300
);
```

### 2. Rate Limiting API Endpoints

```typescript
// Protect link creation endpoint
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  const rateLimitResult = await rateLimiters.createLink(request, userId);
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  // Create link logic
}
```

### 3. Session Storage for Auth

```typescript
// Store user session after login
await setSessionData(sessionId, {
  userId: user.id,
  email: user.email,
  plan: user.plan,
  lastActivity: Date.now()
});
```

### 4. Real-time Notifications

```typescript
// Store notification for user
await redis.lpush(`notifications:${userId}`, JSON.stringify({
  type: "link_created",
  message: "Your link was created successfully",
  timestamp: Date.now()
}));

// Get recent notifications
const notifications = await redis.lrange(`notifications:${userId}`, 0, 9);
```

## Monitoring and Debugging

### Connection Testing

```typescript
import { testRedisConnection } from "@/lib/redis";

const isConnected = await testRedisConnection();
console.log("Redis connected:", isConnected);
```

### Development Logging

In development mode, the Redis connection is automatically tested on startup:

```
✅ Redis connection established
```

or

```
⚠️ Redis connection failed - some features may not work
```

## Best Practices

### 1. Error Handling

All Redis helpers include error handling and fallback behavior:

```typescript
// Rate limiting fails open - allows requests if Redis is down
// Cache falls back to fresh data if cache fails
// Session operations log errors but don't crash
```

### 2. Key Naming

Use consistent key naming patterns:

```typescript
// Cache keys: `cache:type:id`
// Session keys: `session:sessionId`
// Rate limit keys: `rate-limit:identifier:endpoint`
// Analytics keys: `analytics:type:id:date`
```

### 3. TTL Management

Set appropriate TTL values:

```typescript
// Cache: 5 minutes to 1 hour
// Sessions: 24 hours
// Rate limits: Match the rate limit window
// Analytics: 1 day to 1 week
```

### 4. Data Serialization

Always serialize complex data:

```typescript
await redis.set("key", JSON.stringify(complexObject));
const data = JSON.parse(await redis.get("key") as string);
```

## Example API Routes

See these example routes for complete implementations:

- `src/app/api/examples/rate-limited/route.ts` - Rate limiting and caching
- `src/app/api/examples/session/route.ts` - Session management

## Performance Considerations

1. **Connection Pooling**: Upstash handles this automatically
2. **Batch Operations**: Use pipelines for multiple operations
3. **Memory Usage**: Monitor Redis memory usage in Upstash dashboard
4. **Key Expiration**: Always set TTL for temporary data

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check environment variables
2. **Rate Limit Not Working**: Verify Redis is accessible
3. **Cache Not Working**: Check key naming and TTL settings

### Debug Commands

```typescript
// Test basic operations
await redis.ping();
await redis.set("test", "value");
console.log(await redis.get("test"));

// Check memory usage
const info = await redis.info("memory");
console.log(info);
```

## Integration with Existing Features

The Redis integration is designed to work seamlessly with:

- **Clerk Authentication**: Session management
- **Neon Database**: Query result caching
- **Next.js API Routes**: Rate limiting middleware
- **React Query**: Server state synchronization

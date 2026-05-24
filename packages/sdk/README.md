# @linkforge/sdk

Official TypeScript SDK for the [LinkForge](https://linkforge.app) link management platform.  
Full type inference on every method — zero `any` types.

## Installation

```bash
npm install @linkforge/sdk
```

## Quick Start

```typescript
import LinkForge from "@linkforge/sdk";

const lf = new LinkForge("lf_sk_your_api_key");

const link = await lf.links.create({ destination: "https://example.com" });
console.log(link.shortUrl); // https://lf.app/abc123
```

## API Reference

### `new LinkForge(config)`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `config` | `string \| LinkForgeConfig` | — | API key string or config object |

**`LinkForgeConfig`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Your API key |
| `baseUrl` | `string` | `https://api.linkforge.app` | API base URL |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `retry` | `{ attempts: number, delay: number }` | `{ attempts: 3, delay: 1000 }` | Retry policy |

---

### `lf.links`

#### `create(options)`

```typescript
const link = await lf.links.create({
  destination: "https://example.com",
  slug?: "custom-slug",
  title?: "My Link",
  tags?: ["marketing"],
  expiresAt?: "2026-12-31T23:59:59Z",
  clickLimit?: 1000,
  password?: "secret",
  utm?: { source: "twitter", medium: "social", campaign: "launch" },
  abTest?: {
    enabled: true,
    variants: [
      { destination: "https://a.com", weight: 50, label: "A" },
      { destination: "https://b.com", weight: 50, label: "B" },
    ],
  },
  smartRouting?: {
    ios: "https://apps.apple.com/...",
    android: "https://play.google.com/...",
    geo: { US: "https://us.example.com", GB: "https://uk.example.com" },
  },
});
// → Link
```

#### `list(options?)`

```typescript
const result = await lf.links.list({
  page: 1,
  limit: 20,
  search: "blog",
  tag: "marketing",
  sortBy: "clicks",
  order: "desc",
});
// → { links: Link[], total: number, page: number, limit: number, hasMore: boolean }
```

#### `get(id)`

```typescript
const link = await lf.links.get("link_id_here");
// → Link
```

#### `update(id, options)`

```typescript
const link = await lf.links.update("link_id", {
  title: "New Title",
  isActive: false,
});
// → Link
```

#### `delete(id)`

```typescript
await lf.links.delete("link_id");
// → void
```

#### `analytics(id, options?)`

```typescript
const stats = await lf.links.analytics("link_id", {
  range: "30d",         // "1h" | "24h" | "7d" | "30d" | "90d" | "365d"
  groupBy: "day",       // "hour" | "day" | "week" | "month"
});
// → LinkAnalytics (summary, timeSeries, geography, devices, referrers, abTestResults)
```

#### `bulkCreate(links)`

```typescript
const links = await lf.links.bulkCreate([
  { destination: "https://a.com" },
  { destination: "https://b.com" },
]);
// → Link[]
```

#### `getQRCode(id, options?)`

```typescript
const qrUrl = await lf.links.getQRCode("link_id", {
  size: 512,
  format: "png",
});
// → string (CDN URL of QR code)
```

---

### `lf.analytics`

#### `getWorkspaceAnalytics(options?)`

```typescript
const overview = await lf.analytics.getWorkspaceAnalytics({
  range: "30d",
  groupBy: "day",
});
// → workspace analytics data
```

#### `trackConversion(event)`

```typescript
await lf.analytics.trackConversion({
  linkId: "link_id",
  event: "purchase",
  value: 49.99,
  currency: "USD",
  sessionId: "session_abc",
  customerId: "user_123",
  metadata: { source: "email_campaign" },
});
// → void
```

#### `getAttribution(options)`

```typescript
const report = await lf.analytics.getAttribution({
  model: "time_decay",   // "first_touch" | "last_touch" | "linear" | "time_decay"
  range: "30d",
});
// → AttributionReport (totalConversions, totalRevenue, linkCredits, paths, averages)
```

#### `exportCSV(options?)`

```typescript
const blob = await lf.analytics.exportCSV({ range: "30d", linkId: "link_id" });
// → Blob (downloadable CSV)
```

---

## TypeScript Usage

All methods are fully typed — no `any` types anywhere:

```typescript
import LinkForge, { Link, LinkAnalytics, AttributionReport } from "@linkforge/sdk";

const lf = new LinkForge("lf_sk_key");

// Full type inference on create
const link: Link = await lf.links.create({
  destination: "https://example.com",
});

// Full type inference on list response
const { links, total, hasMore } = await lf.links.list({ page: 1 });

// Analytics with typed options
const analytics: LinkAnalytics = await lf.links.analytics("link_id", {
  range: "30d",
});

// Attribution report with typed model
const report: AttributionReport = await lf.analytics.getAttribution({
  model: "time_decay",
});
```

---

## Error Handling

```typescript
import LinkForge, { LinkForgeError } from "@linkforge/sdk";

const lf = new LinkForge("lf_sk_key");

try {
  await lf.links.create({ destination: "invalid" });
} catch (err) {
  const apiError = err as LinkForgeError;
  console.error(apiError.code);    // "VALIDATION_ERROR"
  console.error(apiError.status);  // 422
  console.error(apiError.message); // Human-readable message
}
```

**Error properties:**

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | Machine-readable error code |
| `status` | `number` | HTTP status code |
| `message` | `string` | Human-readable description |

**Common error codes:**

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SERVER_ERROR` | 500 | Internal server error |

Client-side errors (4xx) are thrown immediately. Server errors (5xx) are retried automatically up to 3 times with exponential backoff before throwing.

---

## Rate Limits

| Plan | Requests/hour |
|------|--------------|
| Free | 100 |
| Starter | 1,000 |
| Growth | 5,000 |
| Agency | 20,000 |
| Business | 50,000 |

Rate limit headers are returned on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## License

MIT

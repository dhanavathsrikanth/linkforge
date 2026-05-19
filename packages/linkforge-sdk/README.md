# LinkForge SDK

TypeScript SDK for the [LinkForge](https://linkforge.app) API — link shorting, analytics, and QR code generation.

## Installation

```bash
npm install linkforge-sdk
```

## Quickstart

```typescript
import { LinkForgeClient } from "linkforge-sdk";

const client = new LinkForgeClient({
  apiKey: "lf_sk_...",
});

// Create a short link
const link = await client.links.create({
  destination: "https://example.com/long-url",
  slug: "my-slug",        // optional — auto-generated if omitted
  title: "My Link",
  tags: ["marketing"],
});

console.log(link.id, link.slug);

// List links with pagination
const { data: links, meta } = await client.links.list({
  offset: 0,
  limit: 20,
  search: "example",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | Your API key (`lf_sk_` or `lf_pk_`) |
| `baseUrl` | `string` | `https://api.linkforge.app` | API base URL |

## Key Types

- **Secret keys** (`lf_sk_*`): Full CRUD access.
- **Publishable keys** (`lf_pk_*`): Read-only. Mutations return 403.

Check the type at runtime:

```typescript
client.getKeyType(); // "secret" | "publishable"
```

## Links

```typescript
// List
const { data: links, meta } = await client.links.list({ offset: 0, limit: 50, search: "blog" });

// Get by ID
const link = await client.links.get("link-id");

// Create
const link = await client.links.create({
  destination: "https://example.com",
  slug?: "custom-slug",
  title?: "My Link",
  description?: "Description",
  tags?: ["prod"],
  password?: "secret",
  expiresAt?: "2026-12-31T23:59:59Z",
  clickLimit?: 1000,
  utmSource?: "newsletter",
  utmMedium?: "email",
  utmCampaign?: "launch",
  abTestEnabled?: false,
});

// Update
const link = await client.links.update("link-id", { title: "New Title", isActive: true });

// Delete (deactivates)
const result = await client.links.delete("link-id");
```

## Analytics

```typescript
// Overview
const overview = await client.analytics.overview({ range: "30d" });
// { totalClicks, uniqueClicks, clicksToday, clicksGrowth, topLink, topCountry, topDevice }

// Breakdown by dimension
const byCountry = await client.analytics.breakdown({ dimension: "country", range: "7d" });
const byDevice = await client.analytics.breakdown({ dimension: "device", range: "30d" });
// Dimensions: "country" | "device" | "browser" | "os" | "referrer"

// Timeseries
const hourly = await client.analytics.timeseries({ groupBy: "hour", range: "24h" });
const daily  = await client.analytics.timeseries({ groupBy: "day", range: "30d" });

// Top links
const topLinks = await client.analytics.topLinks({ range: "7d", limit: 10 });
// Each entry includes a 7-day trend array + CTR
```

Filter any analytics endpoint by link:

```typescript
await client.analytics.overview({ linkId: "link-id" });
```

## QR Codes

```typescript
// Get raw PNG bytes
const buffer: ArrayBuffer = await client.qr.generate({
  url: "https://example.com",
  size: 512,
  fgColor: "#000000",
  bgColor: "#ffffff",
  errorLevel: "M",
});

// Or get a data URL (e.g. for <img> tags)
const dataUrl = await client.qr.generateDataURL({
  url: "https://example.com",
  size: 256,
});
```

## API Key Management

```typescript
// List keys (id, name, prefix, type, dates — no full keys)
const keys = await client.keys.list();

// Create a new key — returns the full key exactly once
const created = await client.keys.create("My Key", "secret");
console.log(created.plaintextKey); // ← save this, it won't be shown again

// Revoke a key
await client.keys.revoke("key-id");
```

## Workspace

```typescript
// Get workspace info
const ws = await client.workspace.get();
// { id, name, slug, plan, logo, createdAt }

// Update workspace name or logo
await client.workspace.patch({ name: "New Name" });
```

## Error Handling

```typescript
import {
  LinkForgeError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "linkforge-sdk";

try {
  await client.links.create({ destination: "not-a-url" });
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message, err.details);
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited, retry at ${err.resetTime}`);
  } else if (err instanceof LinkForgeError) {
    console.error(`${err.code}: ${err.message}`);
  }
}
```

## Rate Limits

| Plan | Calls/hour |
|---|---|
| Free | 100 |
| Starter | 1,000 |
| Growth | 5,000 |
| Agency | 20,000 |
| Business | 50,000 |

Rate limit headers are available on every response via `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

## License

MIT

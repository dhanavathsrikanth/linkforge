# Design Document

## Overview

This design implements custom-domain assignment for PivotURL: short links and a single root bio served from a workspace's verified custom domains, with deterministic edge routing, explicit per-domain roles, plan-gated convenience features, suspension, and safe deletion that preserves analytics.

It is grounded in the existing codebase. The guiding principle is **minimal additive change**: extend the existing `domains` table and `plans.ts`, wire `domainId` into the link APIs (the one genuinely missing piece), add one routing-config KV key, and keep the host-based link cache untouched.

### Canonical tiering assumption

This design adopts the **`pricing-and-monetization-strategy` spec's 4-tier model — `free` / `pro` / `business` / `enterprise`** — as the source of truth, because it is the approved spec and the requirements (Req 22–24) were written against it. The plan-enum migration and `planLimits.ts` removal are **owned by the pricing spec** and are prerequisites for the plan-gated parts of this design (Req 22–24). The domain-routing parts (Req 1–11, 16–21, 25) are independent of tiering and can ship first.

### Dependency ordering

```
pricing spec: plan enum migration + planLimits.ts removal   ← prerequisite for Req 22-24 only
        │
        ├─ Phase 1 (tiering-independent): schema additions, link API domainId fix,
        │   worker routing + system-path guard, deletion+analytics guarantee, KV config key
        │
        └─ Phase 2 (needs tiering): customDomains=0 on Free, default-domain gate,
            role=both gate, usage dashboard
```

## Architecture

### Request flow (custom hostname → edge)

```
Visitor → Cloudflare → Worker (apps/worker)
   │
   ├─ Host == pivoturl.com?  → existing /p/{slug} bio + /{slug} link paths (unchanged)
   │
   └─ Host == custom domain
        │
        ├─ KV: domain:{host} → { role, status, workspaceId, hasRootBio }
        │       (miss → /api/internal/domain-resolve, warm 60s)
        │
        ├─ status != active        → 503 (billing) / 410 (abuse)   [Req 17]
        ├─ system path?            → passthrough to origin           [Req 5.6]
        │     (favicon.ico, robots.txt, sitemap.xml, manifest.json, .well-known/*)
        │
        ├─ path == "/"             → root-bio → root-redirect → 404  [Req 5.1]
        └─ path == "/{seg}"        → link slug (LINKS_KV.{host}:{slug}
                                       → /api/internal/links) → 404  [Req 5.1, 6]
```

### Control plane (dashboard/API → DB + KV + Cloudflare)

```
Dashboard /dashboard/domain
   │  add / verify / set-role / set-default / bind-bio / assign-link / suspend / delete
   ▼
Next.js API (/api/domains/*, /api/links/*, /api/gallery)
   │  canAdmin / canWrite (workspace.ts)        [Req 16]
   │  checkLimit('customDomains')               [Req 22]
   │  plan capability flags                     [Req 23, 24]
   ├─► Postgres (domains, links, linkGallery)
   ├─► Cloudflare Custom Hostnames API
   └─► Worker /internal/* (KV sync, 2s timeout) [Req 7]
```

## Data Models

### `domains` table — additive columns

```ts
// New enums
export const domainRoleEnum   = pgEnum("domain_role",   ["links", "bio", "both"]);
export const domainStatusEnum = pgEnum("domain_status", ["active", "suspended_billing", "suspended_abuse"]);

// Added to existing domains pgTable:
role:            domainRoleEnum("role").notNull().default("links"),          // Req 1
isApex:          boolean("is_apex").notNull().default(false),                // Req 10
rootRedirectUrl: text("root_redirect_url"),                                  // Req 10
status:          domainStatusEnum("status").notNull().default("active"),     // Req 17
suspendedAt:     timestamp("suspended_at", { withTimezone: true }),          // Req 17
suspendedReason: text("suspended_reason"),                                   // Req 17
```

No change to existing columns. `domain` stays globally unique (Req 16/20). `isDefault` reused for default domain (Req 4).

### `linkGallery` table — additive

```ts
isRootPage: boolean("is_root_page").notNull().default(false),   // reserved for future multi-bio; unused in v1 routing
```

### Indexes

```ts
// At most one bio per domain (v1: that bio is the root)         [Req 3.1]
uniqueIndex("link_gallery_custom_domain_uidx")
  .on(linkGallery.customDomainId)
  .where(sql`custom_domain_id IS NOT NULL`);

// Retained unchanged:
//  - link_gallery_slug_idx (global bio slug uniqueness)         [Req 3.2]
//  - links_domain_slug_unique_idx (domainId, slug)              [already exists, now actually used]
//  - domains_workspace_idx
```

### `links.domainId` — already exists

No schema change. The fix is in the **API layer** (it never accepted `domainId`).

### Dropped

`workspaces.customDomain` (dead column) — removed in the migration after confirming no readers (audit found none in active paths).

## Components and Interfaces

### 1. Link API: wire `domainId` (Req 2) — the core unblock

`src/app/api/links/route.ts` (`CreateLinkSchema`) and `src/app/api/links/[id]/route.ts` (`UpdateLinkSchema`):

```ts
// add to both schemas
domainId: z.string().uuid().optional().nullable(),
```

Create-path logic:

```ts
// resolve effective domain
let domainId: string | null = v.domainId ?? null;
if (domainId === null && hasDefaultDomainCapability(limits)) {
  const def = await db.query.domains.findFirst({
    where: (d, { eq, and }) => and(eq(d.workspaceId, v.workspaceId), eq(d.isDefault, true), eq(d.verified, true)),
  });
  domainId = def?.id ?? null;                                   // Req 4.2 silent default
}

if (domainId) {
  const dom = await db.query.domains.findFirst({ where: eq(domains.id, domainId) });
  if (!dom || dom.workspaceId !== v.workspaceId) return error(400, "DOMAIN_NOT_FOUND");
  if (!dom.verified)                                            return error(400, "DOMAIN_NOT_VERIFIED");
  if (dom.role === "bio")                                       return error(409, "ROLE_DISALLOWS_LINKS"); // Req 1.4
  if (isReservedSlug(slug))                                     return error(409, "SLUG_RESERVED");        // Req 9
}

// slug uniqueness scoped to domain  [Req 2.4] — replaces the current global eq(slug)
const clash = await db.query.links.findFirst({
  where: (l, { eq, and, isNull }) =>
    and(eq(l.slug, slug), domainId ? eq(l.domainId, domainId) : isNull(l.domainId)),
});
if (clash) return error(409, domainId ? "SLUG_TAKEN_ON_DOMAIN" : "SLUG_TAKEN");
```

`isReservedSlug` is extracted from the `RESERVED_SLUGS` set currently inline in `/api/gallery` into a shared `src/lib/reserved-slugs.ts`, extended with `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, and `.well-known/` prefix (Req 9.1).

### 2. Domain role + default + suspension APIs

`PATCH /api/domains/[id]` (extend the existing handler):

```ts
// body: { action: "setDefault" | "setRole" | "suspend" | "unsuspend", role?, status?, reason?, rootRedirectUrl? }
```

- `setDefault` — reuse existing logic; **add capability gate** `requireCapability(limits, "defaultDomainEnabled")` → 402 if Free (Req 23.2/23.3).
- `setRole` — validate `role=both` requires `mixedDomainRoleEnabled` (Req 24); reject lowering role with conflicting bindings → 409 `ROLE_HAS_BINDINGS` (Req 1.5); on success refresh `domain:{host}` KV.
- `suspend`/`unsuspend` — set `status`, `suspendedAt`, `suspendedReason`; refresh KV (Req 17).

All require `canAdmin` (Req 16.3).

### 3. Bio binding (Req 3, 7) — `PATCH /api/gallery`

Already accepts `customDomainId`. Changes:
- Validate target domain `role !== "links"` (Req 1.3) and verified.
- Enforce one-bio-per-domain via the new partial unique index; on conflict return 409 `DOMAIN_IN_USE` unless `force: true`, then atomically clear the previous bio's binding (Req 3.3/3.4).
- Replace fire-and-forget `syncDomainMapping` with an **awaited** call (2s timeout) returning `KV_SYNC_FAILED` on timeout (Req 7). Order: write-new → delete-old (Req 7.4).

### 4. Domain deletion (Req 11, 19) — `DELETE /api/domains/[id]`

```
if (bindings exist && !confirm) → 409 { error: "IN_USE", linkCount, bioCount, bioBinding? }   [Req 11.1]
else (transaction):
  links.domainId = NULL  (already done)                                    [Req 19.2: clicks untouched]
  linkGallery.customDomainId = NULL  (explicit, not just cascade)
  KV.delete(domain:{host}, bio:domain:{host})                             [Req 11.3c/d, 19.1]
  cloudflareCustomHostnames.delete(cfHostnameId)  (already done)
  delete domains row  (already done)
  → on post-DB side-effect failure: 207 with per-step status               [Req 11.4]
keep "cannot delete only verified domain" guard                            [Req 11.5]
```

Analytics are inherently preserved: `clicks` has no `domainId`; nothing is deleted (Req 19).

### 5. Worker routing (Req 5, 6, 17) — `apps/worker/src/domain-routing.ts` (new)

```ts
type RouteResult =
  | { kind: "system-passthrough" }
  | { kind: "suspended"; httpStatus: 503 | 410 }
  | { kind: "root-bio"; galleryId: string }
  | { kind: "root-redirect"; url: string }
  | { kind: "link"; slug: string }
  | { kind: "not-found" };

const SYSTEM_PATHS = new Set(["favicon.ico","robots.txt","sitemap.xml","manifest.json"]);

export function resolveRoute(cfg: DomainConfig, path: string): RouteResult {
  const seg = path.replace(/^\//, "").split("/")[0];           // Req 5.4 first segment only
  if (cfg.status !== "active")
    return { kind: "suspended", httpStatus: cfg.status === "suspended_abuse" ? 410 : 503 };
  if (SYSTEM_PATHS.has(seg) || seg === ".well-known" || path.startsWith("/.well-known/"))
    return { kind: "system-passthrough" };                    // Req 5.6
  if (seg === "") {                                            // root
    if (cfg.hasRootBio) return { kind: "root-bio", galleryId: cfg.rootBioId! };
    if (cfg.rootRedirectUrl) return { kind: "root-redirect", url: cfg.rootRedirectUrl };
    return { kind: "not-found" };
  }
  if (cfg.role === "links" || cfg.role === "both")
    return { kind: "link", slug: seg };                       // resolver checks existence downstream
  return { kind: "not-found" };
}
```

`index.ts` reads `domain:{host}` from KV (miss → `/api/internal/domain-resolve`, warm 60s), calls `resolveRoute`, then dispatches: `link` → existing `LINKS_KV.{host}:{slug}` path (unchanged); `root-bio` → existing bio HTML cache; `suspended`/`system-passthrough`/`root-redirect`/`not-found` → direct responses. This is a pure function → unit-testable (Req 5.5).

### 6. KV (Req 8, 25)

| Key | Value | TTL | Notes |
|---|---|---|---|
| `domain:{host}` | `{ role, status, workspaceId, hasRootBio, rootBioId?, rootRedirectUrl? }` | none | **new**, control-plane writes |
| `bio:domain:{host}` | `{ slug, galleryId }` | none | retained |
| `LINKS_KV.{host}:{slug}` | Link payload | 60s | **retained (Option A)** |
| `bio:html:{galleryId}`, `bio:og:{galleryId}` | — | 60s / 1h | unchanged |

New worker internal endpoint `/internal/domain-config` (POST, worker-secret) to write/delete `domain:{host}`, called by the control plane on role/status/binding changes. `/api/internal/domain-resolve` (GET, worker-secret) for cache-miss warming.

### 7. Billing capability flags (Req 22, 23, 24)

Add to each tier's `limits` in `plans.ts`:

```ts
defaultDomainEnabled: boolean,   // Free: false, paid: true   [Req 23]
mixedDomainRoleEnabled: boolean, // Free: false, paid: true   [Req 24]
// and change:
customDomains: 0,  // Free (was -1)                           [Req 22.3]
```

Pro = 3, Business = 25, Enterprise = 50 (per pricing spec; founder to confirm exact Pro/Business numbers). Helper `requireCapability(limits, key)` returns the standard 402 via `billingLimitError`. No inline `plan === …` checks (Req 23.4, pricing spec Req 1.7).

### 8. Usage dashboard (Req 21)

`getUsageSummary` already returns `customDomains` current + limit. Add to the response a breakdown computed from the `domains` rows: `{ active, disabled, suspended }` (group by whether row is over-limit / `status`). The domain dashboard renders plan, used/limit, the breakdown, and an upgrade CTA reusing `billingLimitError`'s `upgradeTo`. No new billing math (Req 21.2).

## Error Handling

| Code | HTTP | Trigger |
|---|---|---|
| `DOMAIN_NOT_VERIFIED` | 400 | assign link/bio to unverified domain |
| `ROLE_DISALLOWS_LINKS` / `ROLE_DISALLOWS_BIO` | 409 | binding contradicts role; UI offers switch-to-both |
| `ROLE_HAS_BINDINGS` | 409 | lowering role with conflicting bindings |
| `SLUG_TAKEN_ON_DOMAIN` / `SLUG_RESERVED` | 409 | per-domain slug clash / reserved path |
| `DOMAIN_IN_USE` | 409 | bind bio to domain already holding a bio (force to override) |
| `DOMAIN_ALREADY_REGISTERED` | 409 | hostname exists in any workspace |
| `IN_USE` | 409 | delete domain with bindings, no confirm |
| `KV_SYNC_FAILED` | 502 | edge KV write timeout (DB committed; client retries) |
| `BILLING_LIMIT_EXCEEDED` / `FEATURE_NOT_AVAILABLE` | 402 | domain cap, default-domain, role=both gates |
| partial-failure | 207 | delete succeeded in DB, edge/CF cleanup failed |

All 402s carry `upgradeTo` from existing `billingLimitError`.

## Correctness Properties

These invariants must hold regardless of input and are the basis for the test suite.

### Property 1: Routing determinism and precedence

For any `(DomainConfig, path)`, `resolveRoute` returns exactly one `RouteResult`, with strict precedence: `suspended` > `system-passthrough` > (root path: `root-bio` > `root-redirect` > `not-found`) > (non-root path: `link` if role allows > `not-found`). No input yields two outcomes or skips a higher-precedence branch.

**Validates: Requirements 5.1, 5.4, 5.5**

### Property 2: System paths never render a bio or link

For any domain regardless of `role` (including `bio`), a request for `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, or any `/.well-known/*` path resolves to `system-passthrough`.

**Validates: Requirements 5.6, 9.1**

### Property 3: Analytics conservation

Deleting a domain never reduces the count of `clicks`, `linkGalleryClicks`, or `linkGalleryBlockEvents` rows for the workspace. Only `links.domainId` and `linkGallery.customDomainId` transition to `NULL`.

**Validates: Requirements 19.2, 19.3, 19.4**

### Property 4: One bio per domain

At most one `linkGallery` row has a given non-null `custom_domain_id` (enforced by partial unique index); a second bind without `force` is rejected, and with `force` the prior binding is cleared in the same transaction.

**Validates: Requirements 3.1, 3.3, 3.4**

### Property 5: Per-domain slug uniqueness

`(domainId, slug)` is unique for non-null `domainId`; `(NULL, slug)` is unique in the global namespace. The same slug may exist on different domains.

**Validates: Requirements 2.4, 2.5**

### Property 6: Domain-workspace immutability

A domain's `workspace_id` never changes after creation; the only way to re-home is delete + re-add (which forces re-verification).

**Validates: Requirements 16.1, 20.1, 20.3**

### Property 7: Gate parity

Every plan-gated action (domain create over cap, set-default, role=both) is rejected server-side whenever it would be hidden in the UI; the UI gate is never the sole enforcement.

**Validates: Requirements 22.1, 23.2, 23.3, 24.2, 24.3**

### Property 8: KV reflects DB

After any successful role/status/binding mutation, `domain:{host}` in KV equals the DB-derived config; otherwise the mutation returns `KV_SYNC_FAILED` (502) with the DB change committed and a retry queued — never a silent divergence reported as success.

**Validates: Requirements 7.1, 7.3, 1.6**

## Testing Strategy

- **Worker routing (unit):** `resolveRoute` table-driven — every branch and ordering (suspended > system-path > root-bio > root-redirect > link > 404), system paths on `role=bio`, two-segment paths.
- **Link API (integration):** `domainId` assignment, per-domain slug uniqueness (same slug on two domains OK; dup on one domain 409), reserved slug rejection, silent default application, role mismatch.
- **Bio bind:** one-per-domain enforcement, force-reassign, `KV_SYNC_FAILED` timeout path.
- **Deletion + analytics (Req 19 regression):** create link on domain → record clicks → delete domain → assert clicks preserved and analytics endpoint returns `domain: null`.
- **Billing gates:** Free blocked on customDomains/default/role=both at the API (bypass test via direct call), paid allowed.
- **Verification lock (Req 20):** cross-workspace re-register 409; re-verify of verified domain doesn't drop `verified` or rebind workspace.

## Migration Strategy

One ordered Drizzle migration (Req 15):
1. Create `domain_role`, `domain_status` enums.
2. Add columns to `domains` (`role` default `links`, `is_apex`, `root_redirect_url`, `status` default `active`, `suspended_at`, `suspended_reason`); add `linkGallery.is_root_page`.
3. Add partial unique index on `linkGallery(custom_domain_id) WHERE custom_domain_id IS NOT NULL`.
4. Drop `workspaces.custom_domain`.

Backfill (idempotent script):
- Set `role` from existing bindings (heuristic seed, since role is now explicit: a domain with a bound bio → `bio`, with links → `links`, both → `both`; admins can change after).
- Write `domain:{host}` KV per verified domain.
- Keep existing `bio:domain:{host}` entries.
- Detect/repair multi-bio-per-domain anomalies (keep most-recent, log rest).

**Backward compatibility:** all schema changes additive with defaults → existing rows valid immediately. `links.domainId` already nullable. The Free `customDomains: -1 → 0` change is the only behavioral break and is gated behind the pricing spec's migration + grandfather window (Req 22.7).

**Rollback:** Phase-1 routing changes roll back by reverting the worker + nulling the new KV key (host-based link cache untouched, so redirects keep working). Schema columns are additive and safe to leave. The billing change (Free=0) rolls back by restoring `customDomains: -1` in `plans.ts`.

## Open decision for the founder

Exact Pro/Business domain counts. The hard requirement is **Free = 0**; the requirements doc records `Pro = 3, Business = 25, Enterprise = 50` mapped from the original `Starter 3 / Growth 10 / Agency 50`. Confirm before the Phase-2 billing tasks.

# Requirements Document

## Introduction

LinkForge (product name PivotURL) already registers custom domains in `/dashboard/domain` and provisions Cloudflare Custom Hostnames + SSL automatically. The infrastructure is partly built but **not wired end-to-end**:

- **Short links** have a `links.domainId` FK and a `(domainId, slug)` unique index, and the worker's internal resolver (`/api/internal/links`) already resolves `host → domains row → link by (domainId, slug)`. BUT the link create/update API (`/api/links`) has **no `domainId` field** and checks slug uniqueness **globally** (`eq(l.slug, slug)`), so no custom-domain short link can ever be created through the product. The feature is dead-ended.
- **Bio pages** have a `linkGallery.customDomainId` FK and an in-bio domain picker, and the worker resolves custom-domain bios via KV `bio:domain:{host}`. BUT `linkGallery.slug` is **globally unique** (`link_gallery_slug_idx`), the KV sync on bind is fire-and-forget (UI can show "active" while KV is empty), and domain deletion never purges the KV mapping.
- **Billing** still ships the legacy 6-tier `plans.ts` with **Free `customDomains: -1` (unlimited)** — a live revenue leak. (Closing this is owned by the `pricing-and-monetization-strategy` spec; this spec assumes that fix lands and references it, but does not re-implement it.)

This spec defines a **v1-scoped** custom-domain assignment system that ships the revenue-generating capability with a small, additive migration, deliberately avoiding the multi-bio-per-domain machinery that none of Dub.co, Bitly, Short.io, or Rebrandly actually lead with.

### v1 scope (this spec)

1. **A domain is a first-class object owned by a workspace, carrying a `role`** (`links` | `bio` | `both`).
2. **Short links can be assigned to a verified domain** — `acme.co/promo` redirects through the same pipeline as `pivoturl.com/s/promo`. (Fixes the dead-ended API.)
3. **At most one bio per domain, served at the domain root** (`acme.co/`). This replaces the current one-way picker with a managed, mutually-exclusive binding.
4. **A workspace default domain** auto-applies silently to new short links.
5. **Deterministic edge routing** with a single typed resolver: root-bio → short-link slug → 404.
6. **Safe, transactional domain deletion** that cleans the edge.
7. **Apex-vs-subdomain DNS guidance** so apex domains get correct setup instructions.

### Explicitly deferred to "Future" (NOT in v1)

- **Multiple bios per one domain at path-scoped usernames** (`acme.co/john`, `acme.co/mary`). Requires dropping the global bio slug index and introducing a username-vs-slug shared namespace. Captured in the "Future scope" section; do not implement now.
- New `link:{host}:{slug}` KV namespace. v1 reuses the existing `LINKS_KV` `{host}:{slug}` cache.
- Cross-workspace domain transfer.

## Glossary

- **Domain row** — a record in the existing `domains` table, owned by a workspace, with Cloudflare Custom Hostname + SSL state.
- **Domain role** — `domains.role` ∈ {`links`, `bio`, `both`}. Determines what the domain serves and which lookups the worker runs.
- **Verified domain** — `domains.verified = true` AND `cfHostnameStatus = active` AND `cfSslStatus = active` (when Cloudflare is configured). Only verified domains may be assigned or set as default.
- **Default domain** — `domains.is_default = true`. New short links created without an explicit domain choice fall back to this. One per workspace. (Reuses the existing `isDefault` column and `PATCH /api/domains/[id]` "set primary" path.)
- **Root bio** — the single bio bound to a domain, served at `https://{domain}/`. Tracked via `linkGallery.custom_domain_id` (the bio at root) — v1 allows at most one bio per domain.
- **Link binding** — `links.domain_id` referencing a verified domain row. Serves the short link at `https://{domain}/{slug}`.
- **Apex domain** — a registrable domain with no subdomain label (`acme.co`). Cannot use a plain CNAME at the apex; needs CNAME-flattening / ALIAS at the DNS provider. Tracked via `domains.is_apex`.
- **Root redirect** — `domains.root_redirect_url`, used for `role = links` domains to 302 the bare `/` path somewhere instead of 404.
- **KV keys** — `domain:{host}` (routing config), `bio:domain:{host}` (existing bio mapping, retained), `LINKS_KV.{host}:{slug}` (existing short-link cache, retained), `bio:html:{galleryId}` / `bio:og:{galleryId}` (existing, unchanged).
- **CNAME target** — `links.pivoturl.com` (env `CLOUDFLARE_CNAME_TARGET`), what customer DNS points at.

## Requirements

### Requirement 1: Domain role on the existing domains table (explicit intent)

**User Story:** As a workspace admin, I want to explicitly declare whether a domain serves short links, a bio page, or both, so its routing behavior is a stable, chosen setting and never changes as a side effect of an unrelated binding.

#### Acceptance Criteria

1. THE `domains` table SHALL gain a `role` column of type `pgEnum("domain_role")` with values `links`, `bio`, `both`, NOT NULL, default `links`. No parallel `custom_domains` table SHALL be created.
2. WHEN a domain is added THEN `role` SHALL default to `links` (the most common case) AND SHALL be changeable by an admin to `bio` or `both` from the domain dashboard. `role` SHALL be an explicitly chosen intent, NOT derived from current bindings.
3. WHEN a user attempts to bind a bio to a domain whose `role = links` THEN the API SHALL reject with HTTP 409 `{ error: "ROLE_DISALLOWS_BIO" }`, AND the UI SHALL offer a one-click "Allow bio pages on this domain" action that sets `role = both` before retrying.
4. WHEN a user attempts to assign a short link to a domain whose `role = bio` THEN the API SHALL reject with HTTP 409 `{ error: "ROLE_DISALLOWS_LINKS" }`, AND the UI SHALL offer the equivalent one-click switch to `both`.
5. WHEN an admin lowers a role (e.g. `both` → `bio`, or `both` → `links`) while bindings of the now-disallowed type still exist THEN the API SHALL reject with HTTP 409 listing the conflicting bindings (`{ error: "ROLE_HAS_BINDINGS", links?: [...], bio?: {...} }`); the user SHALL remove those bindings first.
6. WHEN `role` changes THEN the API SHALL update the `domain:{host}` KV key (Requirement 8) in the same transaction so the worker observes the new role without a database lookup.

### Requirement 2: Wire domainId into the link APIs (fix the dead-ended feature)

**User Story:** As a workspace member, I want to choose which verified domain a short link uses when I create or edit it, so `acme.co/promo` actually works.

#### Acceptance Criteria

1. THE `CreateLinkSchema` in `POST /api/links` SHALL accept an optional `domainId` (uuid). THE `UpdateLinkSchema` in `PATCH /api/links/[id]` SHALL accept an optional `domainId` (uuid or null).
2. WHEN a link is created with a `domainId` THEN the API SHALL verify the domain belongs to the same workspace AND is verified, rejecting with HTTP 400 `{ error: "DOMAIN_NOT_VERIFIED" }` otherwise.
3. WHEN a link is created without a `domainId` AND the workspace has a default domain THEN the API SHALL set `domainId` to the default domain's id (Requirement 4.2). WHEN there is no default THEN `domainId` SHALL remain NULL (served from `pivoturl.com/s/{slug}`).
4. THE slug-uniqueness check in link create/update SHALL be scoped to the domain: it SHALL check `and(eq(slug), eq(domainId))` for custom domains and `and(eq(slug), isNull(domainId))` for the default namespace. It SHALL NOT use the current global `eq(l.slug, slug)` check.
5. WHEN a created or updated link's `(domainId, slug)` pair already exists THEN the API SHALL reject with HTTP 409 `{ error: "SLUG_TAKEN_ON_DOMAIN" }`.
6. WHEN a link's `domainId` is created, changed, or cleared THEN the API SHALL write/refresh/delete the `LINKS_KV.{host}:{slug}` cache entry accordingly (or rely on its 60s TTL for refresh). THE assignment SHALL be validated against the domain's `role` per Requirement 1.4 (a `role = bio` domain rejects link assignment).

### Requirement 3: One bio per domain at root

**User Story:** As a workspace admin, I want to bind one bio page to a custom domain so `acme.co/` shows that page, with a clear rule that a domain hosts at most one bio.

#### Acceptance Criteria

1. THE database SHALL enforce at most one bio per domain via a partial unique index on `linkGallery (custom_domain_id) WHERE custom_domain_id IS NOT NULL`.
2. THE global `link_gallery_slug_idx` on `linkGallery.slug` SHALL be retained unchanged in v1 (bio slugs stay globally unique; this is acceptable because a domain-bound bio is served at root, not at `/{slug}`).
3. WHEN `PATCH /api/gallery` receives a `customDomainId` that is already bound to a different bio in the same workspace AND no `force: true` flag THEN the API SHALL respond with HTTP 409 `{ error: "DOMAIN_IN_USE", currentBioId, currentBioSlug, domain }`.
4. WHEN the same request includes `force: true` THEN the API SHALL atomically clear the previous bio's `custom_domain_id` and set the new one, updating KV for both in the same request.
5. WHEN a bio is bound to a domain THEN the binding SHALL be validated against the domain's `role` per Requirement 1.3 (a `role = links` domain rejects bio binding). WHEN a bio is bound or unbound THEN the API SHALL update KV (Requirement 8) in the same request.

### Requirement 4: Default domain for new short links

**User Story:** As a workspace admin, I want to mark one verified domain as the default so every new short link automatically uses it without my choosing each time.

#### Acceptance Criteria

1. THE existing `PATCH /api/domains/[id]` "set primary" path SHALL be reused to set `is_default`; it SHALL continue to clear `is_default` on all other workspace domains and set it on the chosen one in a single transaction, AND SHALL continue to reject non-verified domains.
2. WHEN a workspace has a default domain AND a short link is created without `domainId` THEN the API SHALL silently assign the default domain's id. There SHALL be NO confirmation prompt.
3. WHEN the link creation modal is in "advanced options" mode THEN the user SHALL be able to override the default and either pick another verified domain or explicitly choose the global `pivoturl.com` namespace (`domainId = null`).
4. WHEN a default domain is deleted OR loses verified status THEN the workspace SHALL revert to no default; existing links keep their `domainId` until explicitly changed.

### Requirement 5: Deterministic worker routing on custom hostnames

**User Story:** As a visitor and as an admin, I want a single, predictable order in which the edge resolves a request on a custom hostname.

#### Acceptance Criteria

1. WHEN the Cloudflare worker receives a request on a host other than `pivoturl.com` (or its subdomains) THEN it SHALL resolve using the following precedence, partitioned by path so the order is unambiguous:

   **System paths (checked first, before any branch below):** WHEN the path is `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, or starts with `.well-known/` THEN the worker SHALL pass through per Requirement 5.6 and SHALL NOT treat it as a bio or link.

   **Empty path (`/`):**
   1. **Root bio** — IF the domain has a bound bio (role `bio` or `both`) THEN serve that bio page.
   2. **Root redirect** — ELSE IF `root_redirect_url` is set THEN 302 to it.
   3. **404** — ELSE return the branded 404 page.

   **Non-empty path (`/{segment}/...`):**
   1. **Bio username** — (future multi-bio only; no-op in v1) — reserved for path-scoped bios.
   2. **Short-link slug** — IF the domain role is `links` or `both` AND the first path segment matches an active link on this domain (via `LINKS_KV.{host}:{slug}`, falling back to `/api/internal/links` on cache miss) THEN perform the redirect.
   3. **404** — ELSE return the branded 404 page.
2. THE worker SHALL read the domain role and status from a single `domain:{host}` KV key (Requirement 8) and SHALL NOT call Postgres for a routing decision on the hot path.
3. WHEN the `domain:{host}` key is missing on cache miss THEN the worker MAY fall back to its existing per-resolver origin calls (`/api/internal/links`, bio mapping) AND SHALL warm KV from the response with a 60-second TTL.
4. WHEN the path has more than one segment (e.g. `/promo/extra`) THEN the short-link slug SHALL be exactly `path.split("/")[1]`; trailing segments SHALL be ignored for slug resolution.
5. THE routing precedence in 5.1 SHALL be encoded as a single pure function in `apps/worker/src/domain-routing.ts` returning a typed `RouteResult = { kind: "system-passthrough" | "root-bio" | "root-redirect" | "link" | "not-found", … }`, so ordering can be unit-tested in isolation.
6. **System path passthrough.** BEFORE evaluating the bio/link branches, WHEN the request path is `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, or begins with `.well-known/` THEN the worker SHALL pass the request through to origin (or serve the platform default asset) and SHALL NOT render a bio page or resolve a short link for it. This guard SHALL apply regardless of domain role, including `role = bio` domains (where the current bio handler otherwise serves bio HTML for every path).

### Requirement 6: Short-link routing parity through custom hostnames

**User Story:** As a visitor opening `acme.co/promo`, I want the same redirect behavior, gating, and tracking as `pivoturl.com/s/promo`.

#### Acceptance Criteria

1. WHEN the worker resolves a custom-hostname link THEN it SHALL apply the same gating it uses today for `pivoturl.com` redirects: `isActive`, `expiresAt`, `scheduledAt`, `clickLimit`/`expiresAfterClicks`, `password`, `routingRules`, and `abTestVariants`.
2. THE `/api/internal/links` resolver SHALL continue to resolve `?domain={host}&slug={slug}` to a `domains` row and return the link only when the domain is verified; it SHALL return 404 otherwise. (This already exists; v1 SHALL NOT regress it.)
3. WHEN a click is recorded for a custom-hostname link THEN the click row SHALL include the correct `linkId` and a `referrerDomain` derived from the Referer header, matching the `pivoturl.com/s/*` analytics shape.
4. WHEN a request hits `/` on a `role = links` domain AND no `root_redirect_url` is set THEN the worker SHALL return the branded 404 (step 4 of Requirement 5.1).

### Requirement 7: Synchronous KV sync on bio bind

**User Story:** As an admin binding a domain to a bio, I want confirmation that the edge mapping is live, not a false "active" state.

#### Acceptance Criteria

1. WHEN a bio is bound/unbound via `PATCH /api/gallery` THEN the API SHALL call the worker's `/internal/bio/domain-mapping` endpoint AND await confirmation with a 2-second timeout, replacing the current fire-and-forget `syncDomainMapping`.
2. WHEN the worker confirms within 2 seconds THEN the API SHALL return success normally.
3. WHEN the call times out THEN the API SHALL respond with HTTP 502 `{ error: "KV_SYNC_FAILED", retryAfterMs: 2000 }`. THE DB write SHALL still be committed (the assignment is saved), AND the frontend SHALL show a specific message ("Couldn't reach the edge cache. Your domain assignment is saved — refresh in a few seconds.") and queue one automatic retry after `retryAfterMs`.
4. WHEN a bio binding changes from one domain to another THEN the API SHALL order KV operations as write-new → delete-old so visitors never see a 404 mid-transition.

### Requirement 8: Worker KV key structure (reuse existing namespaces)

**User Story:** As a worker maintainer, I want a minimal, documented KV layout that reuses what already exists.

#### Acceptance Criteria

1. THE custom-domain routing SHALL use exactly these keys:

   | Key | Value | TTL | Written by |
   |---|---|---|---|
   | `domain:{host}` | `{ role, workspaceId, hasRootBio: boolean }` | none (manual invalidation) | `PATCH /api/gallery`, `POST/PATCH /api/links`, `PATCH/DELETE /api/domains/[id]`, `POST /api/domains/[id]/verify` |
   | `bio:domain:{host}` | `{ slug, galleryId }` (existing shape, retained) | none | bio bind / unbind |
   | `LINKS_KV.{host}:{slug}` | existing `Link` payload (retained, reused) | 60 s | link create / update / delete; warmed on cache miss |
   | `bio:html:{galleryId}` | rendered HTML | 60 s | existing — unchanged |
   | `bio:og:{galleryId}` | rendered OG image | 1 h | existing — unchanged |

2. v1 SHALL NOT introduce a separate `link:{host}:{slug}` namespace; the existing `LINKS_KV` cache key (`{domain}:{slug}`, already used by the worker) is authoritative for short-link caching.
3. WHEN the worker reads `domain:{host}` and finds nothing on cache miss THEN it SHALL fall back to existing origin resolvers and warm the key.
4. WHEN a domain is deleted THEN all of its keys (`domain:{host}`, `bio:domain:{host}`, and any `LINKS_KV.{host}:{slug}` entries it can enumerate) SHALL be cleared (Requirement 11).

### Requirement 9: Reserved slug enforcement

**User Story:** As an admin running a `both` domain, I want the system to refuse a short-link slug that would shadow a system route or the bound bio's root, server-side.

#### Acceptance Criteria

1. THE existing `RESERVED_SLUGS` set (currently only used in `/api/gallery`) SHALL be applied server-side in `POST /api/links` and `PATCH /api/links/[id]` for any link with a non-null `domainId`. Reserved values include at minimum `api`, `health`, `bio`, `links`, `qr`, `admin`, `p`, `s`, `dashboard`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, and any path beginning with `.well-known/`. (System-path protection at the edge is additionally enforced by Requirement 5.6.)
2. WHEN a link create/update on a custom domain uses a reserved slug THEN the API SHALL reject with HTTP 409 `{ error: "SLUG_RESERVED", message: "This path is reserved on this domain. Choose a different slug." }`.
3. THE link-creation modal SHALL call a lightweight `GET /api/links/check-slug?domainId={id}&slug={s}` on blur returning `{ available: boolean, reason?: "SLUG_RESERVED" | "SLUG_TAKEN_ON_DOMAIN" }`. Server-side enforcement (9.1, 9.2, Requirement 2.4) remains authoritative even if the client check passes.

### Requirement 10: Apex vs subdomain DNS guidance

**User Story:** As a user adding `acme.co` (apex) vs `go.acme.co` (subdomain), I want the correct DNS instructions for my case.

#### Acceptance Criteria

1. THE `domains` table SHALL gain `is_apex` (boolean, default false) and `root_redirect_url` (text, nullable).
2. WHEN a domain is added THEN the API SHALL detect apex vs subdomain (apex = exactly one label before the public suffix) and set `is_apex` accordingly.
3. WHEN `is_apex = true` THEN the domain setup UI SHALL present CNAME-flattening / ALIAS guidance appropriate to Cloudflare Custom Hostnames (SSL for SaaS), NOT raw A-records-to-our-IPs. WHEN `is_apex = false` THEN it SHALL present the existing `CNAME {host} → links.pivoturl.com` instructions.
4. THE existing SSL-status messaging in `POST /api/domains/[id]/verify` SHALL be retained unchanged — it is already correct and user-friendly.
5. WHEN a `role = links` domain has `root_redirect_url` set THEN the domain panel SHALL let an admin edit it; otherwise the bare `/` returns 404 per Requirement 6.4.

### Requirement 11: Transactional domain deletion with edge cleanup

**User Story:** As an admin deleting a domain, I want to know exactly what breaks, and I want the edge cleaned up so nothing keeps serving from a deleted domain.

#### Acceptance Criteria

1. WHEN `DELETE /api/domains/[id]` is called AND the domain has any bindings (links OR a bio) AND the body lacks `{ confirm: true }` THEN the API SHALL respond with HTTP 409 `{ error: "IN_USE", linkCount, bioCount, bioBinding?: { bioId, slug } }`.
2. THE UI SHALL render a warning populated from the 409 body listing affected links and bio, AND SHALL require the user to type the domain name to confirm.
3. WHEN delete is confirmed THEN the handler SHALL, in order: (a) set `links.domain_id = NULL` for all links on this domain (already done today), (b) set `linkGallery.custom_domain_id = NULL` for the bound bio, (c) delete `bio:domain:{host}` and `domain:{host}` KV keys, (d) delete `cloudflareCustomHostnames.delete(cfHostnameId)` (already done today), (e) delete the `domains` row (already done today).
4. WHEN any step after the DB mutations fails (KV or Cloudflare) THEN the API SHALL log full context AND return HTTP 207 indicating which side effects succeeded, so the user can retry edge/Cloudflare cleanup.
5. THE existing guard preventing deletion of the only verified domain SHALL be retained.

### Requirement 12: Domain assignment surface in the dashboard

**User Story:** As an admin, I want to manage bio and link assignments and the default domain from `/dashboard/domain`, not by digging through each bio's settings.

#### Acceptance Criteria

1. WHEN a user expands a verified domain row THEN the panel SHALL show: a read-only `role` badge with a plain-language explanation, a "Bio page" section (bind/unbind the single bio, or empty state), and a "Short links" section (count, "Open in Links" filtered by `domainId`, and "Set as default for new links").
2. WHEN the domain is not verified (`cfHostnameStatus !== "active"` OR `cfSslStatus !== "active"`) THEN the assignment sections SHALL be disabled with a tooltip "Domain must be verified before it can serve traffic", while the existing DNS/verify UI remains.
3. THE bio binding control SHALL reflect Requirement 3 (one bio per domain) and surface the 409 `DOMAIN_IN_USE` conflict inline with a confirm-to-reassign action.

### Requirement 13: Bio settings parity

**User Story:** As an admin editing a bio, I want the existing in-bio domain picker to reflect the new one-bio-per-domain rule.

#### Acceptance Criteria

1. THE `SidebarSettings` domain picker SHALL show only verified domains AND SHALL annotate any domain already bound to another bio as "in use by {bioName}".
2. WHEN the user selects a domain already bound to another bio THEN the picker SHALL show an inline confirm dialog before issuing the PATCH with `force: true`, mirroring the dashboard (Requirement 3.3/3.4).
3. WHEN no verified domains exist THEN the picker SHALL render the existing "Add a domain" CTA to `/dashboard/domain`.

### Requirement 14: Plan limits (reference only)

**User Story:** As a founder, I want domain limits enforced per plan without duplicating billing logic in this feature.

#### Acceptance Criteria

1. Domain count limits SHALL remain owned by the `pricing-and-monetization-strategy` spec and enforced via the existing `checkLimit('customDomains', …)` in `POST /api/domains`. This spec SHALL NOT redefine plan numbers.
2. Assignment, role changes, default selection, and bio binding SHALL be free under any plan (no per-action gating).
3. WHEN a workspace exceeds its `customDomains` limit after a downgrade THEN the oldest unassigned, non-default domains SHALL be rendered with a "downgrade required" banner but SHALL NOT be auto-deleted.
4. THE `customDomains` limit SHALL count every existing `domains` row in the workspace regardless of verification, assignment, or suspension state. Deleting a domain SHALL immediately free a slot.
5. WHEN a workspace upgrades THEN the higher limit SHALL apply immediately with no migration; any previously soft-disabled domains SHALL re-activate automatically if they now fit under the new limit.
6. Soft-disabled (over-limit after downgrade) AND suspended (Requirement 17) domains SHALL continue to consume a slot while their row exists; the workspace SHALL delete a domain or upgrade to reclaim the slot. This prevents reclaiming capacity by parking domains in a suspended state.

### Requirement 15: Migration & backfill

**User Story:** As an operator, I want a single additive migration that backfills roles and KV without downtime.

#### Acceptance Criteria

1. THE migration SHALL add `domains.role`, `domains.is_apex`, `domains.root_redirect_url`, `domains.status` (default `active`), `domains.suspended_at`, `domains.suspended_reason`, `linkGallery.is_root_page` (reserved for future multi-bio; default false, unused in v1 routing), the `domain_role` and `domain_status` enums, and the partial unique index from Requirement 3.1, in one ordered Drizzle migration.
2. THE migration SHALL drop the vestigial `workspaces.custom_domain` column (dead, predates the `domains` table) after confirming no code reads it.
3. THE backfill SHALL set `role` per Requirement 1 for every existing domain, write a `domain:{host}` KV entry per verified domain, and ensure each existing bound bio has its `bio:domain:{host}` entry.
4. WHEN existing data has multiple bios pointing at the same domain (anomaly) THEN the backfill SHALL keep the most-recently-updated binding, clear `custom_domain_id` on the rest, and log each cleared row.
5. THE migration SHALL be idempotent — re-running SHALL be a no-op once data is consistent.

### Requirement 16: Workspace ownership model

**User Story:** As a platform operator, I want a domain to belong to exactly one workspace with clear permission boundaries, so domains are isolated per customer and per client.

#### Acceptance Criteria

1. A domain SHALL belong to exactly one workspace via `domains.workspace_id`. THE `domains.domain` column SHALL remain globally unique (`.notNull().unique()`), so the same hostname can never be registered by two workspaces simultaneously.
2. WHEN a workspace attempts to add a hostname already registered to another workspace THEN the API SHALL reject with HTTP 409 `{ error: "DOMAIN_ALREADY_REGISTERED" }` (preserving current `POST /api/domains` behavior).
3. Domain create, verify, revalidate, role change, default selection, bio binding, suspension, and deletion SHALL require `canAdmin` (owner/admin). Assigning an already-verified workspace domain to a short link SHALL require `canWrite` (owner/admin/editor).
4. **Agency model.** Each client SHALL be modeled as a separate workspace (Clerk organization). A domain SHALL NOT be shared across workspaces; cross-client access is mediated solely by Clerk org membership. There SHALL be no "shared domain pool" across workspaces.
5. WHEN a domain mutation is attempted by a user who is not a member of the owning workspace THEN the API SHALL reject with HTTP 403/404 via the existing `resolveUserWorkspace` guard.

### Requirement 17: Domain suspension

**User Story:** As an operator, I want to suspend a domain for non-payment or abuse without deleting it, so I can preserve the customer relationship (billing) or kill malicious traffic (abuse) instantly.

#### Acceptance Criteria

1. THE `domains` table SHALL gain a `status` column of type `pgEnum("domain_status")` with values `active`, `suspended_billing`, `suspended_abuse`, NOT NULL, default `active`, PLUS nullable `suspended_at timestamptz` and `suspended_reason text`. `status` SHALL be operationally orthogonal to `verified`/`cfHostnameStatus` (verification lifecycle) — a domain may be verified yet suspended.
2. THE `domain:{host}` KV value SHALL include `status`. WHEN `status !== "active"` THEN the worker SHALL short-circuit BEFORE the routing precedence of Requirement 5.1 and serve neither bio nor links: a branded "temporarily unavailable" page with HTTP 503 for `suspended_billing`, and HTTP 410 for `suspended_abuse`.
3. WHEN a domain is suspended THEN the dashboard SHALL render a banner stating the reason and remediation (`suspended_billing` → "Update payment method"; `suspended_abuse` → "Contact support"), AND its assignment controls SHALL be disabled.
4. WHEN a billing-state recovery occurs (successful payment) OR an admin clears the suspension THEN `status` SHALL return to `active`, `suspended_at`/`suspended_reason` SHALL be cleared, and the `domain:{host}` KV entry SHALL be refreshed.
5. Suspended domains SHALL continue to consume a plan slot per Requirement 14.6.
6. Setting or clearing suspension SHALL require `canAdmin`; `suspended_abuse` MAY additionally be set by a platform-level admin/automated abuse process outside the workspace.

### Requirement 18: Scheduled Cloudflare status sync (DNS drift detection)

**User Story:** As an admin, I want PivotURL to notice when my DNS stops pointing at it, so I find out before all my links silently break.

#### Acceptance Criteria

1. A daily scheduled job (reusing the existing GitHub Actions cron pattern used by the URL scanner) SHALL call `cloudflareCustomHostnames.get()` for every verified domain and update `cfHostnameStatus`/`cfSslStatus` + `cfStatusUpdatedAt`.
2. WHEN Cloudflare reports `cfHostnameStatus = "moved"` or `"deleted"` for a previously-verified domain THEN the system SHALL mark it as drifted and surface a dashboard banner ("DNS no longer points to PivotURL — your links and bio on this domain may be down"). THE domain SHALL NOT be auto-suspended or auto-deleted by drift detection.
3. Periodic ownership re-verification (re-checking the `_pivoturl-verify` TXT token on a working domain) AND domain ownership transfer between workspaces are explicitly FUTURE SCOPE — no competitor forces re-proving ownership on a functioning domain, and adding it now is friction without value.
4. THE existing manual `POST /api/domains/[id]/verify` and `/revalidate` endpoints SHALL remain available and unchanged for on-demand checks.

### Requirement 19: Analytics retention after domain deletion

**User Story:** As a workspace owner, I want all historical analytics to survive a domain deletion, so I never lose performance data by detaching a domain.

**Audit note:** This requirement is **already satisfied by the schema** and is documented here to lock the guarantee and add a regression test. The `clicks` table references only `linkId` + `workspaceId` (no `domainId`); `links.domainId` is `onDelete: set null`; analytics consumers (`/api/v1/analytics/top-links`, `/api/internal/clicks`) already resolve the domain via `link.domainId ? … : null` and are null-safe.

#### Acceptance Criteria

1. WHEN a domain is deleted THEN the system SHALL remove only: the `domains` row, the Cloudflare hostname, KV mappings (`domain:{host}`, `bio:domain:{host}`, link cache entries), and routing configuration.
2. WHEN a domain is deleted THEN the system SHALL NOT delete or mutate: `clicks` rows, `linkGalleryClicks`/`linkGalleryBlockEvents`, analytics aggregates, UTM data, referrer data, or link rows. Only `links.domainId` and `linkGallery.custom_domain_id` SHALL be nulled (already the case via `set null`).
3. Historical reports SHALL remain fully accessible after domain deletion; click rows SHALL continue to reference `linkId` and `workspaceId`.
4. ALL analytics queries SHALL continue to function when the domain no longer exists and the hostname no longer resolves; a query SHALL NOT inner-join on `domains` in a way that drops rows when the domain is gone (LEFT JOIN / nullable lookup only).
5. A regression test SHALL assert that deleting a domain with attached links preserves every click row and that the link's analytics endpoint still returns data with `domain: null`.
6. No data migration is required; this requirement is a guarantee + test, not a schema change.

### Requirement 20: Domain verification lock (anti-hijack)

**User Story:** As a platform operator, I want a verified domain permanently bound to its workspace so ownership cannot be hijacked, spoofed, or reassigned.

**Audit note:** Partially enforced today — `domains.domain` is globally unique (blocks cross-workspace re-registration) and all mutations pass `canAdmin` + `resolveUserWorkspace`. This requirement makes the invariants explicit.

#### Acceptance Criteria

1. THE `domains.workspace_id` of a verified domain SHALL be immutable; no API SHALL expose a path to change the owning workspace of an existing domain. Re-homing requires delete + re-add (which forces re-verification under the new workspace).
2. WHEN any request attempts to re-register a hostname already present in the `domains` table (any workspace) THEN the API SHALL reject with HTTP 409 `{ error: "DOMAIN_ALREADY_REGISTERED" }`, regardless of verification state.
3. WHEN a domain is already `verified = true` THEN re-running verification SHALL only refresh Cloudflare status; it SHALL NOT clear `verified`, SHALL NOT rotate the workspace binding, and SHALL NOT downgrade ownership.
4. THE Cloudflare integration SHALL NOT create an ownership-escalation path: `customMetadata` (`workspace_id`, `domain_id`) is informational only and SHALL NOT be trusted as an authorization source; authorization SHALL always derive from the `domains` row + workspace membership.
5. Verification SHALL require BOTH the `_pivoturl-verify` TXT token AND Cloudflare `cfHostnameStatus = active` (+ `cfSslStatus = active` when CF is configured), preserving the current dual-gate; neither alone SHALL flip `verified` true.
6. All domain-mutating endpoints SHALL continue to require `canAdmin` on the owning workspace; abuse-state changes MAY additionally be performed by a platform admin process (Requirement 17.6).

### Requirement 21: Dashboard domain usage visibility

**User Story:** As an admin, I want to see my domain consumption against my plan so I understand limits, disabled domains, and when to upgrade.

**Audit note:** The data already exists via `getUsageSummary` (returns `customDomains` current + limit). This requirement is a UI surface; it SHALL reuse that data and SHALL NOT introduce a second billing computation.

#### Acceptance Criteria

1. THE domain dashboard SHALL display: current plan name, domain limit, count of active domains, count of disabled (over-limit-after-downgrade) domains, and count of suspended domains (Requirement 17).
2. THE usage figures SHALL be sourced from the existing `getUsageSummary`/`getEffectiveLimits` billing helpers; this feature SHALL NOT duplicate plan-limit logic.
3. WHEN the workspace is at its domain limit THEN the panel SHALL render an upgrade CTA naming the next tier (reusing `billingLimitError`'s `upgradeTo` logic).
4. WHEN the workspace has disabled or suspended domains THEN the panel SHALL show the downgrade/suspension impact (e.g. "2 disabled after downgrade — upgrade to re-activate").
5. THE display SHALL match the intent of: `Plan: {plan} · {used} / {limit} Domains Used · {n} Disabled`.

### Requirement 22: Plan gating for domain count

**User Story:** As the founder, I want domain counts gated per plan so custom domains drive upgrades.

**Tiering: RESOLVED.** PivotURL adopts the 4-tier model **Free / Pro / Business / Enterprise** (per the approved `pricing-and-monetization-strategy` spec). Legacy `starter`/`growth`→`pro`, `agency`→`business` migration is owned by that spec. All plan-gated requirements below use these four tiers.

#### Acceptance Criteria

1. THE `customDomains` limit SHALL be owned solely by `src/lib/billing/plans.ts` and enforced solely via `checkLimit('customDomains', …)`. THE legacy `src/lib/billing/planLimits.ts` SHALL be deleted or reduced to a thin re-export (per pricing spec Requirement 1), and all consumers repointed, before new numbers take effect.
2. Domain limits SHALL be: **Free = 0, Pro = 3, Business = 25, Enterprise = 50** (Enterprise overridable upward via `usage_overrides`).
3. THE current `plans.ts` value `free.customDomains = -1` (unlimited) SHALL be changed to `0`. This is a live revenue leak.
4. THE domain slot count SHALL include ALL `domains` rows for the workspace regardless of verification, assignment, suspension, or disabled state (already the behavior of `checkLimit('customDomains')`, which counts rows).
5. Deleting a domain SHALL free a slot immediately (already true — count is a live row count).
6. Suspended (Requirement 17) and disabled (over-limit) domains SHALL continue to consume a slot while their row exists (already true — they remain rows).
7. WHEN Free→0 takes effect AND an existing Free workspace has attached domains THEN those domains SHALL be soft-disabled (banner, traffic handling per Requirement 17/downgrade rules), NOT deleted, with a grandfather window owned by the pricing spec's migration.

### Requirement 23: Default-domain feature gating

**User Story:** As the founder, I want "set a default domain for new links" to be a paid convenience so it nudges Free users to upgrade.

#### Acceptance Criteria

1. Default-domain selection SHALL be: **unavailable on Free; available on Pro, Business, and Enterprise**.
2. THE gate SHALL be enforced **both** in the UI (control hidden/disabled with upgrade affordance) AND server-side in `PATCH /api/domains/[id]` (the "set primary"/default path), returning a consistent 402 `BILLING_LIMIT_EXCEEDED` / `FEATURE_NOT_AVAILABLE` with `upgradeTo: "pro"`.
3. THE server-side gate SHALL prevent bypass via direct API calls; the UI gate alone SHALL NOT be relied upon.
4. A capability flag (`defaultDomainEnabled`) SHALL be added to the plan limits in `plans.ts` rather than inline `plan === …` checks (per pricing spec Requirement 1.7).
5. WHEN a Free workspace has no default capability THEN new links SHALL fall back to the global `pivoturl.com` namespace (`domainId = null`) without error.

### Requirement 24: role=both feature gating

**User Story:** As the founder, I want mixed bio+links on one domain (`role = both`) to be a paid feature, creating a natural upgrade path.

#### Acceptance Criteria

1. Selecting `role = both` SHALL be: **unavailable on Free; available on Pro, Business, and Enterprise**. Free workspaces MAY still pick `role = links` or `role = bio` (single-purpose), just not `both`. (Free has 0 domains in v1 per Requirement 22, so this gate primarily matters for grandfathered/over-limit Free workspaces and future Free-with-domains experiments.)
2. THE gate SHALL be enforced **both** in the UI (the `both` option hidden/disabled with `upgradeTo: "pro"` messaging) AND server-side wherever `role` is set, returning a consistent billing error.
3. THE server-side gate SHALL prevent API bypass.
4. A capability flag (`mixedDomainRoleEnabled`) SHALL live in `plans.ts`.
5. Existing paid workspaces with `role = both` SHALL be unaffected. WHEN a workspace downgrades to Free while holding a `role = both` domain THEN the domain SHALL be soft-handled per the downgrade rules (banner + restricted), NOT silently re-routed, and SHALL be documented in the pricing spec's downgrade flow.

### Requirement 25: KV architecture decision (host-based retained)

**User Story:** As an infrastructure engineer, I want a documented decision on KV key shape so we don't churn the hot path.

#### Acceptance Criteria

1. THE short-link edge cache SHALL retain the host-based key shape `LINKS_KV.{host}:{slug}` (Option A). A domainId-indirection scheme (`domain:{host}` → `domainId`, `link:{domainId}:{slug}`) is explicitly REJECTED for v1.
2. Rationale (recorded): keys are 60s-TTL and lazily populated (self-healing, nothing to migrate); a single lookup keeps the redirect hot path fast; `domains.domain` is immutable in practice (delete + re-add, never rename), so the indirection's rename-safety benefit does not apply.
3. THE only new KV key SHALL be `domain:{host}` carrying routing config (`role`, `status`, `workspaceId`, `hasRootBio`) per Requirement 8 — additive, not a replacement.
4. Option B (domainId-indexed keys) MAY be revisited only if mutable domain renames or bulk per-domain cache invalidation become product requirements.

## Decisions (resolved)


- **One bio per domain, served at root, for v1.** Multi-bio-per-domain at `/{username}` is deferred (see Future scope). This avoids dropping the global bio slug index and building a username-vs-slug shared namespace that no competitor leads with.
- **Domain `role` is explicit intent, not auto-derived.** An admin chooses `links` (default), `bio`, or `both`; bindings are validated against it. This keeps routing predictable and avoids a domain silently changing behavior when a teammate adds an unrelated binding. (Requirement 1.)
- **System paths bypass routing.** `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, and `.well-known/*` pass through to origin at the edge before any bio/link resolution, on every domain including `role = bio`. (Requirement 5.6.)
- **Minimal suspension model in v1.** `status` ∈ {active, suspended_billing, suspended_abuse} gates the domain at the edge; suspended domains still consume a plan slot. (Requirement 17.)
- **DNS drift is detected, not auto-remediated.** A daily CF status sync flags `moved`/`deleted` with a banner; periodic ownership re-verification and ownership transfer stay future scope. (Requirement 18.)
- **Reuse existing KV namespaces.** No new `link:{host}:{slug}` keys; the worker's existing `LINKS_KV.{host}:{slug}` cache is reused. Only `domain:{host}` is added.
- **Add columns to `domains`, never a parallel `custom_domains` table.** Keeps a single source of truth (mirrors the anti-duplication goal in the pricing spec's Requirement 1).
- **Fix the link API first.** Wiring `domainId` into create/update and making slug uniqueness per-domain is the smallest change that unblocks the whole feature; it is Requirement 2 and a prerequisite for everything else.
- **Default domain auto-applies silently.** Override available in advanced options.
- **KV sync on bio bind is synchronous (2s timeout) with `KV_SYNC_FAILED`.**
- **Domain deletion is transactional with edge cleanup; partial failures return 207.**
- **Domains are single-workspace-owned; agencies use one workspace per client.** No shared domain pool. (Requirement 16.)
- **Steer users toward separate domains for bio vs links** (Scenario B/J) as the recommended, simplest path; `role = both` is supported for single-domain users via the routing priority in Requirement 5.

## Future scope (NOT in v1 — captured to avoid re-litigation)

- **Path-scoped multiple bios per domain** (`acme.co/john`, `acme.co/mary`). Would require: dropping `link_gallery_slug_idx`, a compound unique `(custom_domain_id, slug) WHERE custom_domain_id IS NOT NULL`, a per-domain `username` concept distinct from the global slug, a `bio:{host}:{username}` KV namespace, a `__root__` key for the root bio, and reserved-slug arbitration between bio usernames and link slugs on `both` domains. `linkGallery.is_root_page` is added in v1's migration (default false) so this can be enabled later without another column migration.
- **`link:{host}:{slug}` dedicated KV namespace** and retirement of the legacy `LINKS_KV.{domain}:{slug}` keys.
- **Cross-workspace domain transfer.**
- **Click-logging via KV-buffer + cron-flush** (matching the bio analytics pattern) to relieve the synchronous click path before the `clicks` table becomes a bottleneck — related but tracked separately.

## Out of scope

- Email forwarding on custom domains.
- Wildcard subdomains (`*.acme.co`).
- SOC2 / enterprise procurement (separate workstream).

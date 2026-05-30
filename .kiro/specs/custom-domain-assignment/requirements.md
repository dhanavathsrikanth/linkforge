# Requirements Document

## Introduction

LinkForge already lets workspaces register custom domains in `/dashboard/domain` and provisions Cloudflare Custom Hostnames + SSL automatically. Today, only **bio pages** can be bound to a verified domain (via `linkGallery.customDomainId`), and the binding only goes one way — the picker lives in the bio settings, not the domain page. **Short links** can be created against a domain (`links.domainId`) but there is no UI surface for picking which workspace domain a link uses, no concept of a "default" domain for short links, and no inverse view showing which bios/links are using a given domain.

This spec defines how a workspace can assign a verified custom domain so that:

1. **Bio pages** are served at path-scoped URLs like `acme.co/{username}`, with optional root binding so `acme.co/` serves a designated "root" bio.
2. **Short links** redirect at `acme.co/{slug}` through the same pipeline as `pivoturl.com/s/{slug}`.
3. **Both can coexist on the same domain** — a single domain can host multiple bios (each at `/{username}`) and short links (each at `/{slug}`) simultaneously, with deterministic conflict resolution between the two namespaces.

Each domain row carries an explicit `domain_mode` (`links_only`, `bio_only`, `both`) that governs which lookups the Cloudflare worker performs on inbound requests. The worker uses a fixed priority order (root bio → bio username → short-link slug → 404) so behavior is predictable when both spaces overlap.

The custom domain → bio mapping is currently glued together by Cloudflare KV (`bio:domain:{host}` → `{ slug, galleryId }`) and rebuilt on every `PATCH /api/gallery`. Short-link routing on a custom hostname does not currently work end-to-end because the worker never resolves `host → workspaceId → links.domainId` (it falls back to using the host as a domain string, but `domain-client.tsx` never lets a user pick that domain when creating a link).

## Glossary

- **Domain row** — a record in the `domains` table, owned by a workspace, with Cloudflare Custom Hostname + SSL state.
- **Verified domain** — `domains.verified = true` AND `cfHostnameStatus = active` AND `cfSslStatus = active`. Only verified domains may be assigned.
- **Domain mode** — `domains.domain_mode` ∈ {`links_only`, `bio_only`, `both`}. Determines which lookups the worker runs.
- **Default domain** — `domains.is_default = true`. New short links created without an explicit domain choice fall back to this. One per workspace.
- **Bio username** — `linkGallery.slug` when scoped to a custom domain. Each bio's URL on a custom domain is `https://{domain}/{username}`.
- **Root bio** — a bio with `linkGallery.is_root_page = true`. Served at `https://{domain}/` (empty path). At most one root bio per domain.
- **Bio binding** — `linkGallery.custom_domain_id` referencing a verified domain row, plus the bio's `slug` (used as the path segment) and optional `is_root_page` flag.
- **Link binding** — `links.domain_id` referencing a verified domain row. Serves the short link at `https://{domain}/{slug}`.
- **Reserved slug** — when a domain is in `both` mode, every bio username on that domain is reserved against short-link creation on the same domain (and vice versa).
- **KV namespaces** — distinct key prefixes in `BIO_PAGES_KV`: `bio:{domain}:{username}`, `bio:{domain}:__root__`, `link:{domain}:{slug}`.
- **CNAME target** — the apex pointer (`links.pivoturl.com`) that customer DNS must `CNAME` to.

## Requirements

### 1. Domain mode and capability model

**User story:** As a workspace admin, I want each domain to have an explicit mode that says whether it serves bios, short links, or both, so the system knows which lookups to perform and the UI knows which assignment surfaces to show.

#### Acceptance criteria

1.1. THE `domains` table SHALL gain a `domain_mode` column of type enum (`pgEnum("domain_mode")`) with values `links_only`, `bio_only`, `both`, NOT NULL, default `links_only`.

1.2. WHEN a verified domain has zero bio bindings AND at least one short link bound, THE system SHALL set `domain_mode = links_only`.

1.3. WHEN a verified domain has at least one bio binding AND zero short links bound, THE system SHALL set `domain_mode = bio_only`.

1.4. WHEN a verified domain has at least one bio binding AND at least one short link bound, THE system SHALL set `domain_mode = both`.

1.5. THE `domain_mode` column SHALL be maintained by the application layer in the same transaction as any bind/unbind mutation, NOT by a database trigger. After every bind or unbind, the API SHALL recompute the mode and persist it.

1.6. WHEN `domain_mode` changes, THE API SHALL update KV (req 8) so the worker observes the new mode without DB lookups for routing.

### 2. Domain assignment surface in the domains dashboard

**User story:** As a workspace admin, I want to see and change which bio pages and short links are using each verified domain directly from `/dashboard/domain`, so I don't have to dig through every bio's settings to manage assignments.

#### Acceptance criteria

2.1. WHEN a user expands a verified domain row on `/dashboard/domain`, THEN the panel SHALL display three sections: "Mode", "Bio pages on this domain", and "Short links on this domain".

2.2. THE "Mode" section SHALL display the current `domain_mode` value as a read-only badge AND SHALL explain in human terms what is currently served (e.g. "Serves bio pages at /{username} and short links at /{slug}").

2.3. THE "Bio pages on this domain" section SHALL list every bio page in the workspace with its current binding state (bound to this domain at `/{username}`, bound to a different domain, or unbound) AND SHALL allow the user to bind, unbind, mark-as-root, and unmark-as-root each bio inline.

2.4. THE "Short links on this domain" section SHALL display the link count, an "Open in Links" link that filters `/dashboard/links` by `domainId={id}`, and a "Set as default for new links" toggle.

2.5. WHEN the domain has `cfHostnameStatus !== "active"` OR `cfSslStatus !== "active"`, THEN the bio and link assignment sections SHALL be disabled with a tooltip explaining "Domain must be verified before it can serve traffic", AND the existing DNS records / verify UI SHALL remain visible.

2.6. WHILE a domain has at least one bio binding OR at least one link binding OR `is_default = true`, THE delete confirmation prompt on `/dashboard/domain` SHALL list the affected entities and require the user to type the domain to confirm (handled in detail by req 11).

### 3. Bio page slot semantics on a domain

**User story:** As a workspace admin, I want multiple bio pages on a single custom domain — one per username — with optionally one of them designated as the root, so I can host an entire team or a brand's pages on `acme.co/{member}` and put the company page at `acme.co/`.

#### Acceptance criteria

3.1. THE `linkGallery` table SHALL gain an `is_root_page` boolean column NOT NULL default `false`.

3.2. THE database SHALL enforce uniqueness of `(custom_domain_id, slug) WHERE custom_domain_id IS NOT NULL` via a partial unique index, applied via Drizzle migration. This makes a bio's path segment unique per domain while still allowing the same `slug` text to appear on different domains and on the `pivoturl.com/p/{slug}` global namespace (where `custom_domain_id IS NULL`).

3.3. THE database SHALL enforce at most one root bio per domain via a partial unique index on `(custom_domain_id) WHERE is_root_page = true AND custom_domain_id IS NOT NULL`.

3.4. WHEN `PATCH /api/gallery` receives a `customDomainId` change AND the chosen `(customDomainId, slug)` collides with an existing binding on the same domain (different `id`), THE API SHALL respond with HTTP 409 and a body of `{ error: "USERNAME_TAKEN", currentBioId, currentBioSlug, domain }`.

3.5. WHEN `PATCH /api/gallery` receives `is_root_page = true` AND another bio on the same `customDomainId` already has `is_root_page = true`, THE API SHALL respond with HTTP 409 and a body of `{ error: "ROOT_BIO_TAKEN", currentBioId, currentBioSlug, domain }`. THE UI SHALL surface a confirm dialog that, on accept, sends the request again with `force=true` AND the API SHALL atomically clear the previous root flag and set the new one.

3.6. WHEN a bio is bound to a domain (or rebound from one to another), THE API SHALL update KV (req 8) for both the old and new keys in the same request, ordered to avoid a window where two keys map to the same gallery.

3.7. WHEN the global `pivoturl.com/p/{slug}` namespace already contains a bio with the same slug a user is trying to set on a custom domain, THE assignment SHALL still succeed because the partial unique index in 3.2 only constrains rows with a non-null `custom_domain_id`.

### 4. Default domain for short links

**User story:** As a workspace admin, I want to mark one verified domain as the default so every new short link automatically uses it without me having to choose each time.

#### Acceptance criteria

4.1. WHEN a user clicks "Set as default for new links" on a verified domain, AND that domain is verified AND its `domain_mode` is `links_only` or `both`, THE system SHALL clear `is_default` on every other domain in the same workspace AND set it on the chosen one in a single transaction.

4.2. WHEN a workspace has a default domain set AND a user creates a new short link without specifying `domainId`, THE link creation API SHALL silently set `domainId` to the default domain's id. There SHALL be NO confirmation prompt.

4.3. WHEN the link creation modal is in "advanced options" mode, THE user SHALL be able to override the default and either choose another verified domain or explicitly pick the global `pivoturl.com` namespace.

4.4. WHEN a workspace has no default domain set, THE link creation API SHALL keep `domainId = NULL` and the link SHALL serve from `pivoturl.com/s/{slug}` only.

4.5. WHEN a default domain is deleted OR has its verified status revoked, THE workspace SHALL revert to having no default; existing links keep their `domainId` until explicitly changed.

### 5. Worker routing priority order on custom hostnames

**User story:** As a visitor and as a workspace admin, I want a single, deterministic order in which the edge resolves a request on a custom hostname, so behavior is predictable when bios and short links share a domain.

#### Acceptance criteria

5.1. WHEN the Cloudflare worker receives a request on a host other than `pivoturl.com` (or its subdomains), THE worker SHALL execute the following lookup steps **in this exact order**, returning at the first match:

  1. **Root bio.** IF the path is `/` or empty AND a `bio:{host}:__root__` KV entry exists, THEN serve the bio page identified by that entry.
  2. **Bio username.** IF the domain mode is `bio_only` or `both` AND the path's first segment matches a `bio:{host}:{username}` KV entry, THEN serve that bio page.
  3. **Short-link slug.** IF the domain mode is `links_only` or `both` AND the path's first segment matches a `link:{host}:{slug}` KV entry (or, on cache miss, an active `links` row resolved via `/api/internal/links`), THEN perform the redirect.
  4. **404.** Otherwise, return the existing branded 404 page.

5.2. THE worker SHALL read `domain_mode` from a single KV key per host (`domain:{host}` → `{ mode, workspaceId, defaultBioPageId? }`) populated by the API on bind/unbind, so it never has to call back to Postgres for a routing decision.

5.3. WHEN any KV key for a host is missing on cache miss, THE worker SHALL fall back to a single internal HTTP lookup against `/api/internal/domain-resolve?host={host}&path={path}` which returns the resolved entity AND THE worker SHALL warm KV from that response with a 60-second TTL.

5.4. WHEN the path has more than one segment (e.g. `/john/contact`), THE worker SHALL use only the first segment for slug/username lookups; trailing path segments SHALL be passed through unchanged for any in-bio routing the bio public page chooses to interpret. Short-link redirects SHALL always strip trailing segments — the slug is exactly `path.split("/")[1]`.

5.5. THE priority order in 5.1 SHALL be encoded as a single function in the worker (`apps/worker/src/domain-routing.ts`) that returns a typed result — `RouteResult = { kind: "root-bio" | "bio" | "link" | "not-found", … }` — so the test harness can verify ordering in isolation.

### 6. Short-link routing through custom hostnames

**User story:** As a visitor, when I open `acme.co/promo`, I want to be redirected to the destination URL the workspace owner configured, with the same speed and tracking as `pivoturl.com/s/promo`.

#### Acceptance criteria

6.1. WHEN the worker reaches step 3 of the routing priority and finds a `link:{host}:{slug}` KV entry, THE entry SHALL contain enough fields to perform redirect, password gating, expiry, click-limit, smart routing, and A/B selection without any further round trip — mirroring the existing payload structure used for `pivoturl.com/s/{slug}` resolution. KV TTL: 60 seconds.

6.2. WHEN the internal endpoint `/api/internal/links` receives `?domain={host}&slug={slug}`, THE endpoint SHALL resolve the host to a `domains` row, return the matching link only if `domains.verified = true`, and respond 404 otherwise.

6.3. WHEN a short link resolved via custom hostname has any of `password`, `expiresAt`, `clickLimit`, `routingRules`, or `abTestVariants` set, THE worker SHALL apply the same gating logic it currently uses for `pivoturl.com/s/{slug}` redirects.

6.4. WHEN a click is recorded for a custom-hostname short link, THE click row SHALL include `linkId` correctly and `referrerDomain` derived from the original Referer header, matching the analytics shape used for `pivoturl.com/s/*`.

6.5. WHEN a request hits the root path `/` of a custom hostname AND no root bio is bound AND no link with `slug = ""` exists, THE worker SHALL fall through to step 4 (404).

### 7. Bio routing through custom hostnames

**User story:** As a visitor, when I open `acme.co/` or `acme.co/john`, I want to see the bio page that the workspace owner has assigned, served from the edge cache.

#### Acceptance criteria

7.1. WHEN a bio is bound to a domain via `PATCH /api/gallery`, THE API SHALL synchronously call the worker's `/internal/bio/domain-mapping` endpoint with the relevant KV key(s) AND SHALL await confirmation with a 2-second timeout. ON timeout the API SHALL respond with HTTP 502 and a body of `{ error: "KV_SYNC_FAILED", retryAfterMs: 2000 }`. The frontend SHALL surface a specific message for `KV_SYNC_FAILED` ("Couldn't reach the edge cache. Your domain assignment is saved — refresh in a few seconds and try again.") and SHALL queue a single automatic retry after `retryAfterMs`.

7.2. WHEN the worker resolves a host via the bio-namespace KV keys (steps 1 or 2 of req 5.1), THE worker SHALL serve the bio page using the existing HTML cache flow (`bio:html:{galleryId}`) without further DB lookup.

7.3. WHEN a bio binding is changed (old domain → new domain, or `is_root_page` toggled), THE API SHALL remove the old KV key(s) AND write the new one(s) in the same request, ordered as: write-new → delete-old, so visitors never see a 404 mid-transition.

7.4. WHEN a domain row is deleted, THE delete handler SHALL clear all KV keys owned by that domain (one per bound bio plus the optional root key plus all link keys plus the `domain:{host}` mode key) before deleting the Cloudflare hostname AND finally the DB row.

7.5. WHEN `is_root_page` is toggled true on a bio, THE API SHALL write `bio:{domain}:__root__` to KV pointing at that bio AND SHALL keep the `bio:{domain}:{username}` entry intact (so the bio is also accessible at `/{username}`).

### 8. Worker KV key structure

**User story:** As a worker maintainer, I want a single, documented KV key layout so routing is auditable and migrations are predictable.

#### Acceptance criteria

8.1. THE `BIO_PAGES_KV` namespace SHALL contain exactly the following key prefixes for custom-domain routing:

  | Key | Value | TTL | Written by |
  |---|---|---|---|
  | `domain:{host}` | `{ mode, workspaceId, hasRootBio: boolean, defaultBioPageId?: string }` | none (manual invalidation) | `PATCH /api/gallery`, `PATCH /api/links/*`, `DELETE /api/domains/{id}`, `POST /api/domains/{id}/verify` |
  | `bio:{host}:__root__` | `{ galleryId, slug }` | none | bio bind / unbind |
  | `bio:{host}:{username}` | `{ galleryId }` | none | bio bind / unbind |
  | `link:{host}:{slug}` | full `Link` payload (matches existing `LINKS_KV` shape) | 60 s | link create / update / delete, populated lazily on cache miss |
  | `bio:html:{galleryId}` | rendered HTML | 60 s | existing — unchanged |
  | `bio:og:{galleryId}` | rendered OG image | 1 h | existing — unchanged |

8.2. THE legacy `bio:domain:{host}` keys (current shape `{ slug, galleryId }`) SHALL be migrated to the new `bio:{host}:{username}` and optional `bio:{host}:__root__` shape. The migration is performed by the Next.js backfill described in req 13.

8.3. WHEN the worker reads any of the above keys and finds nothing, AND the path corresponds to a hostname with a `domain:{host}` entry, THE worker SHALL fall back to `/api/internal/domain-resolve` (req 5.3) and warm the corresponding key on success.

8.4. THE `link:{host}:{slug}` entries SHALL coexist with the existing `LINKS_KV.{domain}:{slug}` keys for the duration of the migration; once cut over, the legacy keys SHALL be removed in a subsequent cleanup task. (Out-of-scope for this spec's first delivery.)

### 9. Reserved slug enforcement

**User story:** As a workspace admin running a domain in `both` mode, I want the system to refuse creating a short link whose slug collides with an existing bio username on the same domain (and vice versa), so I never have a silent override that breaks routing.

#### Acceptance criteria

9.1. WHEN `POST /api/links` (link create) receives a request with `domainId = X` AND `slug = Y` AND a bio exists with `customDomainId = X` AND `slug = Y`, THE API SHALL respond with HTTP 409 and body `{ error: "SLUG_RESERVED", message: "This slug is used by your bio page on this domain. Choose a different slug or change your bio page username.", conflictWith: { kind: "bio", bioId, bioSlug: Y } }`.

9.2. WHEN `PATCH /api/links/{id}` changes `(domainId, slug)` to a pair already used by a bio on the same domain, THE API SHALL respond with the same `SLUG_RESERVED` error.

9.3. WHEN `PATCH /api/gallery` changes a bio's `(customDomainId, slug)` to a pair already used by an active short link on the same domain, THE API SHALL respond with HTTP 409 and body `{ error: "SLUG_RESERVED", message: "This username is used by a short link on this domain. Choose a different username or remove the conflicting link.", conflictWith: { kind: "link", linkId, slug: Y } }`.

9.4. THE check in 9.1, 9.2, 9.3 SHALL be performed server-side inside the same transaction as the write, NOT relied upon from the client. The Drizzle migration MAY add a deferred check constraint to back the application-level check, but it is not required for the v1 delivery — the server-side guard is authoritative.

9.5. THE link-creation modal SHALL also call a lightweight `GET /api/links/check-slug?domainId={id}&slug={s}` endpoint on blur for fast feedback. THE endpoint SHALL return `{ available: boolean, reason?: "SLUG_RESERVED" | "SLUG_TAKEN_BY_LINK" }`. Server-side enforcement remains in 9.1–9.3 even when the client check passes.

9.6. WHEN a workspace toggles a domain from `links_only` to `both` (because a bio is being bound), THE bind operation SHALL refuse with HTTP 409 if any active short link on the domain shares a slug with the incoming bio's username, returning `{ error: "SLUG_RESERVED", … }`. The user resolves by either renaming the bio username or deleting the conflicting link.

### 10. Bio settings parity

**User story:** As a workspace admin editing a bio, I want to keep the existing in-bio domain picker, but have it reflect the new mutual-exclusion and root-bio rules so I'm not surprised by silent overwrites.

#### Acceptance criteria

10.1. WHEN the user opens the domain picker in `SidebarSettings`, THE picker SHALL show only verified domains AND SHALL annotate each domain with the count of bios already bound (e.g. "acme.co — 3 bios, you're at /{username}") AND a flag indicating whether a root bio exists ("Root bio: john").

10.2. WHEN the user picks a domain that already has a root bio AND ticks "Make this the root page", THE picker SHALL show an inline confirmation dialog before issuing the PATCH, mirroring the dashboard behavior.

10.3. WHEN no verified domains exist, THE picker SHALL render the existing "Add a domain" CTA pointing to `/dashboard/domain`.

10.4. THE bio settings page SHALL surface the bio's username (slug) as the path segment users will type after the domain (e.g. preview reads `acme.co/john`), AND validation SHALL match the existing reserved-slug list plus reject any short-link slug already on the same domain (req 9.3).

### 11. Domain deletion safety

**User story:** As a workspace admin, when I delete a domain, I want explicit awareness of what will break, including reverting bound short links and bios.

#### Acceptance criteria

11.1. WHEN `DELETE /api/domains/{id}` is called AND the domain has any bindings (links OR bios), THE API SHALL return HTTP 409 with `{ error: "IN_USE", linkCount, bioCount, bioBindings: [{ bioId, slug, isRoot }] }` UNLESS the request body includes `{ confirm: true }`.

11.2. THE UI SHALL render a warning dialog populated from the 409 body, listing each affected bio (with link to its settings) and the link count, AND requiring the user to type the domain to confirm.

11.3. WHEN delete is confirmed, THE handler SHALL atomically: (a) set `links.domain_id = NULL` for all links on this domain, (b) set `linkGallery.custom_domain_id = NULL` AND `linkGallery.is_root_page = false` for any bio bound to this domain, (c) call the worker `/internal/bio/domain-mapping` with `remove: true` for each bio's hostname-keyed entry, (d) call the worker `/internal/domain-mode` with `remove: true` for `domain:{host}`, (e) call `cloudflareCustomHostnames.delete(cfHostnameId)`, (f) delete the `domains` row.

11.4. WHEN any step in 11.3 fails after the DB rows have been mutated, THE API SHALL log the failure with full context AND return HTTP 207 with a body indicating which side-effects succeeded, leaving the user able to retry the worker / Cloudflare cleanup from a "Stuck deletes" admin tray.

### 12. Plan limits (informational)

12.1. THE existing `customDomains` plan limit SHALL continue to gate `POST /api/domains` only; assignment changes are free under any plan.

12.2. WHEN a workspace's plan is downgraded such that `current > limit` for `customDomains`, THE oldest unassigned, non-default domains SHALL be marked as soft-disabled (rendered with a "downgrade required" banner) but never auto-deleted.

### 13. Migration & backfill

13.1. THE migration SHALL add the new columns (`domains.domain_mode`, `linkGallery.is_root_page`) and partial unique indexes (req 3.2, 3.3) in a single ordered Drizzle migration.

13.2. THE migration SHALL run a one-time pass that:

  - For each existing `linkGallery` row with a non-null `custom_domain_id`, write the new `bio:{domain}:{username}` KV entry AND set `domains.domain_mode = "bio_only"` (or `"both"` if the same domain already has bound links).
  - For each existing `links` row with a non-null `domain_id`, write the new `link:{domain}:{slug}` KV entry AND set `domains.domain_mode = "links_only"` (or `"both"`).
  - For each verified domain, write the canonical `domain:{host}` KV entry.
  - Remove every legacy `bio:domain:{host}` KV entry after the new entries are confirmed written.

13.3. WHEN existing data contains multiple bios pointing at the same domain with the same slug (data anomaly), THE backfill SHALL keep the most-recently-updated bio's binding, clear `custom_domain_id` on the rest, log each cleared row, AND surface a warning banner to the affected workspace's admins on next dashboard load.

13.4. WHEN existing data contains multiple bios with `is_root_page = true` on the same domain (cannot happen pre-migration since the column doesn't exist yet, but called out for completeness), THE backfill SHALL keep the most-recently-updated bio's flag and clear the rest.

13.5. THE migration SHALL run idempotently — re-running SHALL be a no-op once the data is consistent.

## Decisions (resolved)

These were earlier open questions; they are now settled and informed the requirements above.

- **Multiple bios per domain via path prefixes are supported.** The unique constraint is compound `(custom_domain_id, slug)`, not `custom_domain_id` alone (req 3.2). One bio per domain may additionally be marked as the root (req 3.3).
- **Default domain auto-applies silently to new links.** No prompt at creation. The user can override via the link creation modal's advanced options (req 4.2, 4.3).
- **KV sync is synchronous with a 2-second timeout.** On timeout the API returns `KV_SYNC_FAILED` and the frontend surfaces a specific message and queues one automatic retry (req 7.1).
- **Domain deletion performs transactional cleanup.** A warning dialog lists affected bios and links, the user must explicitly confirm, the cleanup runs transactionally, and partial failures return HTTP 207 (req 11).

## Out of scope

- **Email forwarding** on custom domains.
- **Wildcard subdomains** (e.g. `*.acme.co/{slug}`). The current `domains.domain` column stores one hostname per row.
- **Cross-workspace transfer** of a domain. Deletion + re-add remains the supported path.
- **Cleanup of legacy `LINKS_KV.{domain}:{slug}` keys** after the new `link:{host}:{slug}` keys are in place; tracked separately.
- **Multiple root bios per domain.** Hard cap is one (req 3.3).

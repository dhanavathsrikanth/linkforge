# Implementation Plan

## Overview

Tasks are grouped into two phases. **Phase 1 is tiering-independent** and can start immediately. **Phase 2 depends on the `pricing-and-monetization-strategy` plan-enum migration** (tier rename + `planLimits.ts` removal) and the founder confirming exact Pro/Business domain counts. Each task is incremental, references requirements, and ends in a verifiable state (build + targeted tests).

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 5, 7, 13], "description": "Foundations: schema+enums+index, reserved-slug module, pure routing resolver, worker internal endpoints, ownership/verify-lock guards. No interdependencies." },
    { "wave": 2, "tasks": [3, 8, 6, 11, 12], "description": "Link create domainId (needs 1,2); role+suspension API (needs 1); worker integration (needs 5,7); drift cron (needs 1); apex detection (needs 1)." },
    { "wave": 3, "tasks": [4, 9, 10, 14], "description": "Link update domainId (needs 3); bio bind + KV sync (needs 8); transactional deletion + analytics (needs 1); assignment dashboard (needs 8)." },
    { "wave": 4, "tasks": [15], "description": "Backfill + drop dead column (needs 1,8,9)." },
    { "wave": 5, "tasks": [16], "description": "Phase 2 start — consolidate plans + domain caps. Requires pricing-spec plan migration merged + confirmed tier numbers." },
    { "wave": 6, "tasks": [17, 18, 19, 20], "description": "Gates and visibility: default-domain gate (needs 16,8); role=both gate (needs 16,8); usage panel (needs 16,14); downgrade handling (needs 16)." },
    { "wave": 7, "tasks": [21], "description": "End-to-end verification and rollback rehearsal. Depends on all." }
  ]
}
```

### Visual reference

```
Phase 1 (tiering-independent)
  1 (schema/enums/index)
   ├─► 3 (link create domainId) ──► 4 (link update domainId)
   ├─► 8 (role + suspension API) ──► 9 (bio bind + KV sync)
   ├─► 10 (deletion + analytics)
   ├─► 12 (apex detection)
   └─► 14 (assignment dashboard)
  2 (reserved-slug module) ──► 3
  5 (pure resolver) ──► 6 (worker integration)
  7 (worker internal endpoints) ──► 6
  11 (drift cron) depends on 1
  13 (ownership/verify lock) depends on existing code only
  15 (backfill + drop column) depends on 1, 8, 9

Phase 2 (tiering-dependent) — prerequisite: pricing-spec plan migration merged
  16 (consolidate plans + caps)
   ├─► 17 (default-domain gate)  also depends on 8
   ├─► 18 (role=both gate)       also depends on 8
   ├─► 19 (usage panel)          also depends on 14
   └─► 20 (downgrade handling)

Final
  21 (E2E + rollback rehearsal) depends on all
```

## Tasks

### Phase 1 — Tiering-independent (routing, schema, link API, deletion, KV)

- [x] 1. Add schema columns, enums, and indexes (additive migration)
  - Add `domainRoleEnum` (`links`/`bio`/`both`) and `domainStatusEnum` (`active`/`suspended_billing`/`suspended_abuse`) to `src/lib/db/schema.ts`.
  - Add columns to `domains`: `role` (default `links`), `is_apex` (default false), `root_redirect_url` (nullable), `status` (default `active`), `suspended_at` (nullable), `suspended_reason` (nullable).
  - Add `linkGallery.is_root_page` (default false).
  - Add partial unique index `link_gallery_custom_domain_uidx` on `linkGallery(custom_domain_id) WHERE custom_domain_id IS NOT NULL`.
  - Generate the Drizzle migration; do NOT drop `workspaces.custom_domain` yet (separate task after reader audit).
  - Verify: `drizzle-kit generate` produces one migration; `npm run build` passes.
  - _Requirements: 1.1, 3.1, 10.1, 15.1, 17.1_

- [x] 2. Create the shared reserved-slug module
  - Extract the `RESERVED_SLUGS` set currently inline in `src/app/api/gallery/route.ts` into `src/lib/reserved-slugs.ts`.
  - Add system paths: `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json`, and a `.well-known/` prefix check; export `isReservedSlug(slug)`.
  - Repoint `/api/gallery` to import from the new module (no behavior change there).
  - Verify: unit test `isReservedSlug` for system paths + existing reserved words; build passes.
  - _Requirements: 9.1_

- [x] 3. Wire `domainId` into the link create API
  - Add `domainId: z.string().uuid().optional().nullable()` to `CreateLinkSchema` in `src/app/api/links/route.ts`.
  - Resolve effective domain: explicit `domainId`, else workspace default domain (verified + `isDefault`) when present.
  - Validate: domain belongs to workspace (`DOMAIN_NOT_FOUND` 400), verified (`DOMAIN_NOT_VERIFIED` 400), role not `bio` (`ROLE_DISALLOWS_LINKS` 409), slug not reserved on custom domain (`SLUG_RESERVED` 409).
  - Replace the global slug check with per-domain: `and(eq(slug), domainId ? eq(domainId) : isNull(domainId))`; conflict → `SLUG_TAKEN_ON_DOMAIN`/`SLUG_TAKEN` 409.
  - Persist `domainId` on insert; refresh `LINKS_KV.{host}:{slug}` (or rely on TTL).
  - Verify: integration tests — same slug on two domains OK; dup on one domain 409; reserved slug 409; default auto-applied when set.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.2_

- [x] 4. Wire `domainId` into the link update API
  - Add `domainId` to `UpdateLinkSchema` in `src/app/api/links/[id]/route.ts`.
  - On `domainId`/`slug` change, re-run the same validation + per-domain uniqueness as task 3; refresh/delete the affected `LINKS_KV` entries.
  - Verify: changing a link's domain enforces uniqueness on the target domain; build + tests pass.
  - _Requirements: 2.1, 2.4, 2.5, 2.6_

- [x] 5. Build the pure worker routing resolver
  - Create `apps/worker/src/domain-routing.ts` with `DomainConfig`, `RouteResult`, and `resolveRoute(cfg, path)` exactly per design (precedence: suspended → system-passthrough → root-bio → root-redirect → link → not-found).
  - Verify: table-driven unit tests covering every branch, ordering, system paths on `role=bio`, two-segment paths, empty path variants.
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 6.5_

- [x] 6. Integrate the resolver into the worker fetch path
  - In `apps/worker/src/index.ts`, for non-`pivoturl.com` hosts read `domain:{host}` from KV (miss → `/api/internal/domain-resolve`, warm 60s), call `resolveRoute`, and dispatch:
    - `suspended` → 503 (billing) / 410 (abuse) branded page
    - `system-passthrough` → pass to origin
    - `root-bio` → existing bio HTML cache flow
    - `root-redirect` → 302
    - `link` → existing `LINKS_KV.{host}:{slug}` → `/api/internal/links` redirect flow (unchanged)
    - `not-found` → existing 404 page
  - Keep the host-based link cache exactly as-is (KV Option A).
  - Verify: worker builds; manual/dev test of each branch via Host header.
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.3, 6.4, 17.2, 25.1, 25.3_

- [x] 7. Add worker internal endpoints for domain config
  - Add `POST /internal/domain-config` (worker-secret) to write/delete `domain:{host}` in KV.
  - Add `GET /api/internal/domain-resolve?host=&path=` (worker-secret) returning the config for cache-miss warming.
  - Verify: secret rejection test; round-trip write→read test.
  - _Requirements: 5.3, 8.1, 8.3_

- [x] 8. Domain role + suspension management API
  - Extend `PATCH /api/domains/[id]` with `setRole` (reject lowering with conflicting bindings → `ROLE_HAS_BINDINGS` 409; on success refresh `domain:{host}` KV) and `suspend`/`unsuspend` (set `status`/`suspended_at`/`suspended_reason`, refresh KV).
  - Gate all on `canAdmin`. (role=both capability gate is added in Phase 2.)
  - Verify: role-lower-with-bindings 409; suspend reflects in KV; non-admin 403.
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 16.3, 17.1, 17.3, 17.4_

- [x] 9. One-bio-per-domain binding + synchronous KV sync
  - In `PATCH /api/gallery`, validate target domain is verified and `role != links`; enforce one-bio-per-domain (409 `DOMAIN_IN_USE` unless `force: true`, then atomically clear prior binding).
  - Replace fire-and-forget `syncDomainMapping` with an awaited call (2s timeout) → `KV_SYNC_FAILED` 502 on timeout (DB still committed); order write-new → delete-old.
  - Refresh `domain:{host}` KV (sets `hasRootBio`).
  - Verify: second bind without force 409; force reassign clears prior; timeout returns 502 with committed DB.
  - _Requirements: 1.3, 3.3, 3.4, 3.5, 7.1, 7.3, 7.4, 8.1_

- [x] 10. Transactional domain deletion with edge cleanup and analytics preservation
  - Rework `DELETE /api/domains/[id]`: if bindings exist and no `confirm` → 409 `IN_USE` with counts; on confirm, transaction: null `links.domainId`, null `linkGallery.customDomainId`, delete KV `domain:{host}` + `bio:domain:{host}`, delete CF hostname, delete row.
  - On post-DB side-effect failure → 207 with per-step status. Keep "only verified domain" guard.
  - Verify: **Req 19 regression test** — clicks preserved after delete, analytics endpoint returns `domain: null`; 409 without confirm; 207 path on simulated KV failure.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 11. Scheduled Cloudflare status sync (DNS drift)
  - Add a daily GitHub Actions cron + endpoint that calls `cloudflareCustomHostnames.get()` for verified domains, updates `cfHostnameStatus`/`cfSslStatus`/`cfStatusUpdatedAt`, and flags `moved`/`deleted` as drifted (no auto-suspend).
  - Reuse the existing scanner cron pattern in `.github/workflows`.
  - Verify: drift flag set on simulated `moved`; manual verify/revalidate endpoints unchanged.
  - _Requirements: 18.1, 18.2, 18.4_

- [x] 12. Apex detection + DNS guidance
  - In `POST /api/domains`, set `is_apex` (one label before the public suffix). Surface `is_apex` to the domain UI so it shows CNAME-flattening/ALIAS guidance for apex, CNAME for subdomains.
  - Add `root_redirect_url` editing to the domain panel for `role=links` domains.
  - Verify: apex vs subdomain produce correct `is_apex`; UI shows correct instructions.
  - _Requirements: 10.2, 10.3, 10.5_

- [x] 13. Workspace ownership + verification lock guards
  - Confirm/enforce: no endpoint mutates `domains.workspace_id`; re-register of existing hostname → 409 `DOMAIN_ALREADY_REGISTERED` (any workspace); re-verify of a verified domain only refreshes CF status (never clears `verified` or rebinds).
  - Add explicit tests asserting these invariants.
  - _Requirements: 16.1, 16.2, 16.5, 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 14. Domain assignment dashboard (routing parts)
  - Extend `/dashboard/domain` expanded row with a role badge + explanation, a bio binding control (one bio, with `DOMAIN_IN_USE` confirm-to-reassign), a short-links section (count, "Open in Links" filtered by `domainId`), and disabled state when unverified.
  - Verify: controls disabled when unverified; bio conflict surfaces inline.
  - _Requirements: 12.1, 12.2, 12.3, 13.1, 13.2, 13.3_

- [x] 15. Backfill script + drop dead column
  - Write idempotent backfill: seed `role` from existing bindings, write `domain:{host}` KV per verified domain, ensure `bio:domain:{host}` entries, repair multi-bio-per-domain anomalies (keep most-recent, log rest).
  - ~~After confirming no readers of `workspaces.custom_domain`, drop it in a follow-up migration.~~ **NOT dropped:** `workspaces.custom_domain` is still read by `/api/user/me` (and typed in `useUser.ts`, used by `/dashboard/bio`). Dropping it is deferred until that endpoint is migrated off the column — out of scope for this spec.
  - Verify: re-running backfill is a no-op; anomaly repair logs correctly. Applied to live DB; columns/index/role-seed confirmed.
  - _Requirements: 15.2, 15.3, 15.4, 15.5_

### Phase 2 — Tiering-dependent (billing gates + usage visibility)

> Prerequisite: `pricing-and-monetization-strategy` plan-enum migration (tier rename, `planLimits.ts` removed/re-exported) is merged, and founder has confirmed exact Pro/Business domain counts. Hard requirement regardless: Free `customDomains = 0`.

- [x] 16. Consolidate plan limits and set domain caps
  - Ensure `src/lib/billing/plans.ts` is the sole source; delete or thin-re-export `src/lib/billing/planLimits.ts` and repoint all consumers (`resolvePlanLimits`/`PLAN_LIMITS`/`pct`).
  - Set `customDomains`: Free `0` (was `-1`), Pro `3`, Business `25`, Enterprise `50` (confirm numbers).
  - Add capability flags `defaultDomainEnabled` and `mixedDomainRoleEnabled` to each tier (Free false, paid true).
  - Verify: build passes with no remaining `planLimits.ts` imports; `checkLimit('customDomains')` reflects new caps.
  - _Requirements: 22.1, 22.2, 22.3, 23.4, 24.4_

- [x] 17. Gate default-domain selection
  - In `PATCH /api/domains/[id]` `setDefault`, add `requireCapability(limits, "defaultDomainEnabled")` → 402; hide/disable the default toggle in the UI for Free with an upgrade affordance.
  - Verify: direct-API bypass blocked (402); paid allowed; Free links fall back to global namespace.
  - _Requirements: 23.1, 23.2, 23.3, 23.5_

- [x] 18. Gate role=both selection
  - In `setRole` (task 8) add `requireCapability(limits, "mixedDomainRoleEnabled")` for `both` → 402; hide the `both` option in the UI for Free with upgrade messaging; existing paid `both` domains unaffected.
  - Verify: Free blocked server-side; Free can still pick `links`/`bio`; paid allowed.
  - _Requirements: 24.1, 24.2, 24.3, 24.5_

- [x] 19. Usage visibility panel
  - Extend `getUsageSummary` to return `{ active, disabled, suspended }` domain breakdown computed from rows; render plan, used/limit, breakdown, and upgrade CTA (reusing `billingLimitError` `upgradeTo`) on the domain dashboard. No new billing math.
  - Verify: counts match DB state across active/over-limit/suspended; CTA shows at limit.
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 22.4, 22.5, 22.6_

- [x] 20. Free-tier downgrade handling for domains
  - Implement soft-disable (banner + restricted serving) for over-limit domains after a Free downgrade; never auto-delete; coordinate the grandfather window with the pricing spec's migration.
  - Verify: over-limit domains render disabled, retain rows (still consume slots), re-activate on upgrade.
  - _Requirements: 22.7, 24.5_

### Final verification

- [x] 21. End-to-end verification and rollback rehearsal
  - Run full build + all new unit/integration tests; exercise the 8 correctness properties.
  - Rehearse rollback: revert worker + null `domain:{host}` (confirm host-based redirects still work), confirm additive columns are safe to leave, confirm `customDomains: 0 → -1` restore path.
  - _Requirements: all (regression gate)_

## Notes

- **Tiering decision is the only hard blocker** and it only blocks Phase 2. Phase 1 (tasks 1–15) is fully independent and can begin now. Hard requirement regardless of tiering: Free `customDomains = 0`.
- **KV Option A retained** — the host-based `LINKS_KV.{host}:{slug}` cache is untouched; only the additive `domain:{host}` config key is new. This keeps the redirect hot path single-lookup and makes rollback a 60-second self-heal.
- **Analytics safety (Req 19) is already structurally guaranteed** by the schema (`clicks` has no `domainId`); task 10 only adds the regression test and the explicit null-on-delete, no migration.
- **Cross-spec dependency:** the plan-enum migration and `planLimits.ts` removal are owned by `pricing-and-monetization-strategy`; this plan consumes them in task 16 rather than re-implementing.
- Run `npm run build` plus the relevant unit/integration tests after each task; clean up any temp files used for verification.

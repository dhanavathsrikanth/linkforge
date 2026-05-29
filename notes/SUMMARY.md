# LinkForge — Project Summary

## Current State

Application is fully buildable and testable. All 6 test suites pass (76/76 tests). 2 pre-existing type errors in unrelated code (`packages/linkforge-sdk/src/client.test.ts`, `src/app/(marketing)/pricing/page.tsx`).

## Architectural Overview

- **Framework**: Next.js 15 App Router, React 19, TypeScript
- **Database**: PostgreSQL via Supabase, Drizzle ORM + schema migrations
- **Auth**: Supabase Auth (session-based, server/client helpers)
- **Payments**: Stripe webhooks, subscription-based access control
- **UI**: Tailwind CSS v4, shadcn/ui (Radix primitives), Lucide icons, Framer Motion
- **Monorepo**: npm workspaces (`packages/linkforge-sdk`)

---

## Files Created (chronological)

### Infrastructure & Config
| File | Purpose |
|---|---|
| `drizzle.config.ts` | Drizzle Kit config (schema → migrations) |
| `src/db/schema.ts` | All DB schema (users, links, galleries, blocks, block_events, subscriptions, oauth_states, etc.) |
| `src/db/migrate.ts` | Drizzle migration runner using Postgres.js |
| `src/db/seed.ts` | Seed script (anonymized) |
| `drizzle/0000_*.sql` → `0014_*.sql` | 14 migration files |
| `vitest.config.ts` | Vitest config with path aliases |
| `src/__tests__/gallery-oauth.test.ts` | OAuth flow tests (13) |
| `src/__tests__/gallery-types.test.ts` | Type definitions tests (20) |
| `src/__tests__/gallery-grid.test.ts` | Grid layout tests (10) |
| `src/__tests__/gallery-crypto.test.ts` | Crypto utility tests (7) |
| `src/__tests__/gallery-integrations.test.ts` | Integration definitions tests (12) |
| `src/__tests__/gallery-sync.test.ts` | Sync functions tests (14) |

### Route Handlers (API)
| File | Purpose |
|---|---|
| `src/app/api/stripe/webhook/route.ts` | Stripe webhook → create/manage subscriptions |
| `src/app/api/stripe/checkout/route.ts` | Create Stripe Checkout Session |
| `src/app/api/stripe/portal/route.ts` | Stripe Customer Portal redirect |
| `src/app/api/v1/gallery-block-events/route.ts` | Track block events (rate-limited) |
| `src/app/api/v1/analytics/block-events/route.ts` | Query block analytics |
| `src/app/api/gallery/sync/[blockId]/route.ts` | Sync a block's external data |

### Shared Library
| File | Purpose |
|---|---|
| `src/lib/stripe.ts` | Stripe client init (singleton) |
| `src/lib/plans.ts` | Plan definitions, feature gating helpers |
| `src/lib/grid.ts` | Grid constants, auto-layout, CSS grid-area |
| `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt for tokens |
| `src/lib/gallery/oauth.ts` | OAuth authorize URL + token exchange (5 providers) |
| `src/lib/gallery/integrations.ts` | Provider configs (Spotify, TikTok, Instagram, Threads, GitHub) |
| `src/lib/gallery/crypto.ts` | PKCE code verifier/challenge + state generation |
| `src/lib/gallery/validation.ts` | Block config validation per type |
| `src/lib/gallery/sync.ts` | 7 typed sync functions (one per external data block) |

### Types
| File | Purpose |
|---|---|
| `src/types/gallery.ts` | All gallery types: 19 block types, form configs, defaults, `getBlockDefaults()` |
| `src/types/subscriptions.ts` | Subscription/plan types |

### Gallery (feature)
| File | Purpose |
|---|---|
| `src/components/gallery/BlockRenderer.tsx` | Maps block type → component (server + client) |
| `src/components/gallery/PublicBlockRenderer.tsx` | Same for public pages |
| `src/components/gallery/BlockEditForm.tsx` | Dynamic edit form by block type |
| `src/components/gallery/GalleryGrid.tsx` | CSS Grid layout component |
| `src/components/gallery/GalleryCanvas.tsx` | Drag-and-drop canvas using dnd-kit |
| `src/components/gallery/GalleryToolbar.tsx` | Add-block dropdown |
| `src/components/gallery/blocks/*.tsx` | 18 block components |
| `src/hooks/useBlockSync.ts` | Auto-sync stale blocks client hook |
| `src/hooks/useBlockTracking.ts` | Best-effort block event tracking hook |
| `src/components/gallery/blocks/TrackedLink.tsx` | SSR-safe tracked link wrapper |
| `src/components/gallery/blocks/QRBlock.tsx` | QR code block (qrcode.react) |
| `src/components/gallery/blocks/QRForm.tsx` | QR code edit form |

### Analytics (feature)
| File | Purpose |
|---|---|
| `src/hooks/analytics/index.ts` | `useBlockEvents` — query analytics from the API |

### Other
| File | Purpose |
|---|---|
| `notes/SUMMARY.md` | This file |
| `.cursor/rules/gallery-architecture.md` | Architecture guide for LLM agents |

---

## In Progress

### P10 — Final polish & edge cases
- [ ] Fix 2 pre-existing type errors:
  - `packages/linkforge-sdk/src/client.test.ts:1` — `.ts` extension import
  - `src/app/(marketing)/pricing/page.tsx:104` — dead comparison
- [ ] Add `NotFound` / error boundary for gallery blocks (handles deleted/unauthorized gracefully)
- [ ] Ensure empty gallery page renders a CTA instead of a blank grid

---

## Next Steps (unprioritized)

- **Image upload UI**: Block for user images (Supabase Storage)
- **Custom domain**: CNAME-based custom domain for user galleries
- **SEO**: Per-gallery meta tags, Open Graph images
- **Gallery themes**: Color/font presets
- **Rate-limit analytics endpoint**: Add rate limiting to `GET /api/v1/analytics/block-events`
- **OAuth refresh**: Auto-refresh expired provider tokens in sync calls

---

## Critical Context

### `getBlockDefaults` constraint
`getBlockDefaults()` (in `src/types/gallery.ts`) must be kept in sync with the `BLOCK_TYPES` union. When adding a new block type:
1. Add string literal to `BlockType` union (line ~20)
2. Add config interface + defaults export
3. Add `case "..."` to `getBlockDefaults()` switch (line ~445)
4. Add entry to `BLOCK_TYPES` array
5. Add default size to `BLOCK_DEFAULT_SIZES` in `src/lib/grid.ts`
6. Add component + form files
7. Wire into `BlockRenderer`, `PublicBlockRenderer`, `BlockEditForm`

### When adding a migration
```bash
npx drizzle-kit generate
```
Then review the generated SQL in `drizzle/`.

### Testing
```bash
npm test              # single run
npm run test:watch    # watch mode
npm run typecheck     # tsc --noEmit
```

### Build
```bash
npm run build
```
Runs `next build` (type-checking included). The two pre-existing errors above are not from gallery code.

---

## Completed Phases

### P1 — Core scaffolding, auth, DB (11 files)
### P2 — Billing/payments (plans, Stripe, subscriptions)
### P3 — Gallery block system foundation (types, grid, block registry, editor + public renderers, canvas, toolbar)
### P4 — Additional block components (16 block types, all wiring)
### P5 — OAuth + external integrations (S, T, I, T, G)
### P6 — Integration service layer (sync API, client hook, auto-sync)
### P7 — Block-level analytics (events table, tracking API, analytics query, client hooks)
### P8 — QR Code block (type, component, form wiring)
### P9 — Testing (vitest, 6 test suites, 76 tests, all passing)

# PivotUrl Feature Reference

> Complete feature inventory organized by sidebar navigation.
> Last updated: June 2026 — includes P0 Cloudflare R2 + Analytics Engine changes.

---

## Navigation

- [Overview Dashboard](#overview-dashboard)
- [Link in Bio](#link-in-bio)
- [Links](#links)
- [Link Checker](#link-checker)
- [Link Safety](#link-safety)
- [QR Codes](#qr-codes)
- [Analytics](#analytics)
- [Live Analytics](#live-analytics)
- [Insights](#insights)
- [Settings](#settings)
  - [Account](#account)
  - [Members](#members)
  - [Billing](#billing)
  - [Domains](#domains)
  - [API Keys](#api-keys)
  - [UTM Templates](#utm-templates)
  - [Audit Logs](#audit-logs)
  - [Webhooks](#webhooks)
  - [Feature Flags](#feature-flags)
- [API Docs](#api-docs)
- [Alerting & Cron](#alerting--cron)
- [Cloudflare Integration](#cloudflare-integration)
- [Architecture](#architecture)

---

## Overview Dashboard

**Route:** `/dashboard`

Time-based personalized greeting with first name and current date.

**Quick Actions (3 cards):** Create Link · View Analytics · QR Codes

**KPIs (4 cards):**
- Total Clicks — with growth % (green/red arrow)
- Unique Visitors — raw count
- Deep Link Clicks — platform-specific routing clicks
- Top Link — slug + click count

**Clicks Over Time:** Recharts AreaChart (30-day, gradient fill, Daily badge)

**Smart Insights Preview:** Up to 3 insight cards + Audience Profile + Posting Times

**Top Links (up to 5):** Color-coded rank badges, click to drill into per-link analytics

**Quick Stats Card:** This-period totals, unique/CTR, top performer, top country

---

## Link in Bio

**Route:** `/dashboard/bio`

Create and manage bio/landing pages with drag-and-drop editor, themes, and analytics.

### Bio List

Table of all bio pages: display name, live URL, status (Live/Draft), block count, last updated.

### Editor

Full-screen drag-and-drop editor (`react-grid-layout`):
- **Dual layouts:** Separate 12-col (desktop) and 4-col (mobile) grids
- **Auto-save:** Debounced 1.5s PATCH with `updatedAt` conflict detection
- **Save indicator:** Saving → Saved → Live/Draft saved/Save failed
- **Publish workflow:** Draft → Publish. Published + unsaved → "Update content" vs "Unpublish"
- **Share modal** and live preview link

### Blocks

**Layout blocks** (drag from catalog to canvas):
- Header, Link Box, Social Links, Links list, Content (rich text), Image, Stack, Map, Reactions, Waitlist/Email capture

**Brand blocks** (OAuth-connected live data):
- YouTube embed, Spotify Playlist/Track, Spotify Playing Now, GitHub Commits, Instagram Latest Post, Instagram Followers, Threads Followers, TikTok Latest Video, TikTok Followers

**Block management:** Add from searchable catalog, drag-to-reorder, show/hide, edit form, delete

### Themes

- **Built-in themes:** Multiple preset color schemes
- **Custom themes:** Create/edit/delete with color config + font + background image
- **Live preview:** Hover applies theme to canvas instantly
- **Font loading:** Google Fonts dynamically loaded
- **CSS scoping:** CSS variables injected into `.bio-canvas-root.themed`

### Settings per page

- Visibility toggle, slug editing (min 3 chars, auto-normalized), custom domain picker
- SEO meta title (max 200) and description (max 500)
- "Made with PivotUrl" branding toggle
- Delete page (permanently removes page, blocks, analytics)

### Analytics per page

Stat cards (Views, Unique, Clicks), 7d/30d area chart, top locations, top referrers, device breakdown, top blocks.

### Integrations

OAuth connections for Spotify, Instagram, TikTok, Threads, GitHub. One-click connect/disconnect, popup OAuth flow, toast feedback.

---

## Links

**Route:** `/dashboard/links`

### Create Link

Single link creation via advanced creation sheet:

**General:** Custom slug, destination URL, title, folder assignment, tags

**Advanced:**
- **Password protection:** Lock links with password (bcrypt-hashed). Cookie-based 24-hour bypass.
- **Expiration date:** Links auto-deactivate on a set date.
- **Click limit:** Auto-deactivate after N clicks.
- **Scheduling:** Set future publish date.
- **Deep link routing:** iPhone → App Store, Android → Play Store, fallback. A/B variants also support per-device overrides.

**A/B Testing tab:**
- Add variants with destination URL + weight (traffic share %)
- Bar chart visualization of split
- **Smart AI Optimization:** After sufficient clicks, AI analyzes which variant performs best and suggests optimal weight splits. One-click apply.

**UTM Parameters tab:**
- Source, Medium, Campaign, Term, Content
- Can pre-fill from saved [UTM Templates](#utm-templates)

### Features on the Links Page

- **Bulk Create:** Paste URLs one-per-line or upload CSV. Auto-column detection, review, create. (Growth plan)
- **Export CSV:** Download all links as CSV (slug, destination, title, tags, clicks, UTM params, dates)
- **Check Links:** Quick-nav to [Link Checker](#link-checker)
- **Search/Filter:** By URL/slug/title + folder + tags
- **Bulk actions:** Delete, activate/archive, move to folder, add/remove tags
- **Per-link actions:** Copy short URL, open, QR code panel, edit, delete
- **Expanded analytics row per link:** KPI cards, 7-day clicks chart, top countries, device donut, top referrers, **Live Activity** feed (see [Live Analytics](#live-analytics))
- **AI Slug Suggestions:** Click sparkles icon → extracts meaningful words from URL, drops filler words, joins with dashes. No external AI call.
- **AI Auto-Fill:** Reads destination page, fills title/description/preview image in one click.
- **Ask AI About Analytics:** Type natural-language questions about link data.

### Visitor Flow

1. Visit short link → 2. Password check (24h cookie bypass) → 3. A/B variant selection → 4. Deep-route by device → 5. Append UTM params → 6. Redirect to destination → 7. Record click (Redis real-time + Cloudflare Analytics Engine for time-series)

All in under 1 second.

---

## Link Checker

**Route:** `/dashboard/link-checker`

Bulk scanning for broken or changed links:

**Pre-scan:** Table of links with search, select-all, per-row checkboxes

**Scan:** Sends links to AI for batch checking. Visual scanning animation.

**Results view:**
- **Status badges:** Ok (green) / Broken (red) / Changed (amber)
- **Safety badges:** Safe / Scanning / Suspicious / Malicious / Scan Error (from Cloudflare URL Scanner)
- **HTTP status code**, trust bar (0-100), content drift summary
- **Expandable Cloudflare scan details:** Server IP, country, software, Radar Rank, performance (TTFB/FCP/Load), categories (up to 6), technologies (up to 8), redirect chain (up to 5 hops), phishing kit warnings, scan timestamp
- **Retry** single link or "Retry All Broken"

**Stats row:** Total, OK, Broken, Changed + Cloudflare safety stats

---

## Link Safety

**Route:** `/dashboard/link-safety`

### Safety Overview

**Stats cards:** Total, Safe, Flagged, Pending, Errors, Not scanned

**Filter pills + search:** Filter by status or search slug/destination

**Link list with expandable details:**
- **Status badges:** Blocked, Malicious, Suspicious, Safe, Scanning, Scan failed, Not scanned
- **Trust badges:** Score/100 color-coded (low/medium/high/verified)
- **Actions:** Open link, Rescan (triggers Cloudflare URL Scanner)

**Expanded details (per link):**
- Trust score, malicious verdict, phishing kit detection, Cloudflare Radar Rank
- **Screenshot** — visual proof from Cloudflare URL Scanner (served from R2 — see [R2 Storage](#r2-storage-for-screenshots))
- Page details: Final URL, country, ASN, IP, server
- Categories (tag chips)
- Suspicious assets: crypto miners, browser fingerprinters, excessive 3P cookies, suspicious JS, console errors, expired TLS, long redirect chains, similarity to malicious sites
- DOM analysis: hidden iframes, obfuscated scripts, meta redirects, password inputs, crypto addrs, external form actions
- Redirect chain: numbered hops with status codes + country
- Detected technologies (up to 12, with version)
- Performance: TTFB, FCP, Load time
- Network log: request count, transfer KB, 3P domains, page load time, full HAR download
- **Background polling:** Pending scans auto-refresh every 15 seconds (200+ links supported)
- **Plan-gated features:** Screenshot, technology stack, asset risk flags — Growth plan+

### Abuse Dashboard

Platform-wide or workspace-scoped flagged links management:
- Flagged links list with workspace name (admin view), trust score, asset flags, safety status
- Actions: Block/Unblock (with audit log), Rescan, Open link
- Platform admin badge for super-admins
- Animated table rows (framer-motion)

---

## QR Codes

**Route:** `/dashboard/qr`

**Quick QR Generator:** Paste any URL, generate inline QR, download PNG (standalone, not linked to analytics)

**QR Code Manager ("Your Links"):** Per-link QR cards with:
- Live QR rendered with custom settings (foreground/background color, error correction L/M/Q/H, margin, logo, frame style, frame text)
- Total click count
- **Customize panel:** Color pickers, error correction, margin slider, logo upload (size + opacity), frame style ("scan me" or custom text), boost level, minimum version
- Download PNG
- **Analytics tracking** via PostHog for downloads and customizations
- **Live QR Scan Stream:** Real-time scan events via WebSocket Durable Object (`/do/qr/{qrId}/ws`)

---

## Analytics

**Route:** `/dashboard/analytics`

### Date Range Control
7d / 30d / 90d / Custom range picker

### KPI Cards
Total Clicks, Unique Visitors, Top Link, Deep Link Clicks — all with growth % and animated number transitions

### Navigation Hero Cards
- **Multi-Touch Attribution** → full attribution modeling
- **Smart Insights** → insights page

### Charts
- **Clicks Over Time:** Recharts AreaChart (gradient fill). Toggle Total/Unique views. Grouped by day or hour.
- **Top Countries:** Horizontal bar list with flag emoji, count, % bar
- **Device Breakdown:** Recharts donut pie chart (mobile/tablet/desktop)
- **Top Referrers:** Favicon list with counts and percentages

### Top Links Table
Columns: Link (favicon + title/slug), Clicks, Unique, CTR %, Created date, 7-day Sparkline mini chart. Click row → per-link analytics.

### Analytics Engine (Cloudflare)
Long-term click time-series stored in Cloudflare Workers Analytics Engine (see [Cloudflare Integration](#cloudflare-integration)):
- Written by the deployed Worker (`apps/worker/`) on every click redirect
- Queryable via POST `/api/analytics/engine` (see [API Docs](#api-docs))
- Replaces Postgres-based click INSERT for scalability

### Attribution Modeling
**Route:** `/dashboard/analytics/attribution`

Four models: First Touch, Last Touch, Linear, Time Decay. Summary KPIs, sortable Link Attribution table, Top Customer Paths, Journey Timeline search (by email/session ID), Model Comparison modal.

---

## Live Analytics

**Route:** `/dashboard/analytics/live`

Architecture: WebSocket connections through Cloudflare Durable Objects (SQLite-backed). No polling.

### Connection Status
Pulsing green badge: "WebSocket Active". Architecture diagram showing DO flow.

### Live Feed (`useLiveAnalytics`)
- Real-time click stream via Durable Object WebSocket (`analytics-ws`)
- LIVE/RECONNECTING/OFFLINE badge + click count
- Each row: device icon, country, city, browser, OS, referrer, timestamp
- Animated entry/exit (framer-motion slide-in)
- Requires `?linkId=YOUR_LINK_ID` query param

### Live A/B Test Results
- WebSocket to `/do/abtest/ab:{linkId}/ws`
- Animated Progress bars per variant showing win probability %
- Winning variant: TrendingUp icon + green highlight
- Total click count + LIVE badge

### Live QR Scan Stream
- WebSocket to `/do/qr/{qrId}/ws`
- Real-time QR scan events with device, country, city, browser, OS, timestamp

### Data Flow
Click → Queue → Analytics Engine (time-series) + WebSocket push (real-time, via DO)

---

## Insights

**Route:** `/dashboard/analytics/insights`

### AI-Powered Insight Cards
Fetched from `/api/v1/analytics/insights`. Four card types:
- **Opportunity** (emerald) — growth opportunities
- **Trend** (blue) — upward/downward trends
- **Warning** (amber) — issue alerts
- **Recommendation** (violet) — actionable suggestions

### Audience Profile
5 stat rows (Primary Device, Top Browser, OS, Top Country, Top Referrer) with gradient progress bars + Platform Split segmented bar (Mobile/Desktop/Other %)

### Best Posting Times
- **Hour heatmap:** 24-column grid, height = click intensity, color-scaled gray → violet. Peak hour gets violet ring.
- **Peak indicator:** Time-of-day icon + click count
- **Recommendation:** Text paragraph suggesting optimal posting times

---

## Settings

**Route:** `/dashboard/settings`

### Account
**Route:** `/dashboard/settings/account`

Full profile management via Clerk UserProfile: name, email, avatar, password, MFA, connected OAuth accounts, active sessions. Organization management via Clerk OrganizationProfile.

### Members
**Route:** `/dashboard/settings/members`

Team management via Clerk OrganizationProfile. Create organization, invite members, manage roles, review pending invitations.

### Billing
**Route:** `/dashboard/settings/billing` (also at `/dashboard/billings`)

**Current Plan:** Name, price, billing cycle, next billing date, cancellation status. Manage Subscription / Upgrade Plan buttons.

**Usage Meters:** Links/mo, clicks/mo, domains, team members, bio pages, QR codes/mo — progress bars with limits.

**Upgrade section:** Side-by-side plan cards with comparisons.

**Billing History:** Table of billingEvents: date, description, amount, status.

### Domains
**Route:** `/dashboard/settings/domains` (also at `/dashboard/domain`)

**Domain list:** Table with status (Verified/Pending/Error), created date, actions menu.

**Add domain:** Inline form, auto-lowercase, POST to API.

**Usage panel:** Plan name + domain usage (used/limit). Upgrade link at limit.

**Domain detail (expandable):**
- Status callouts, metadata (created date, Cloudflare hosting, linked link count)
- CNAME status + SSL status badges
- Verify Now / Re-validate SSL buttons
- **Domain mode:** "Links only", "Bio only", or "Both"
- Apex domain DNS hints (CNAME flattening)

**DNS Records table:** Type, Name, Content, TTL, Status — all copyable.

**Row actions:** View Setup, Set as Primary, Delete Domain (reverts links to default).

### API Keys
**Route:** `/dashboard/settings/api-keys` (also at `/dashboard/developers/api-keys`)

**List:** Name, Prefix (`lf_sk_...` / `lf_pk_...`), Type (Secret/Publishable), Created, Last Used, Status (Active/Revoked).

**Create:** Name + type selector. Full key shown once with copy + visibility toggle.

**Revoke:** Confirmation dialog, instant, shown with "Revoked" badge.

**Quick Reference:** `Authorization: Bearer lf_sk_...`, base URL, rate limits (Free: 100 req/hr).

### UTM Templates
**Route:** `/dashboard/settings/utm-templates`

Pre-configured UTM templates for quick link creation. Create template with name, source, medium, campaign, term, content. Default template indicator.

### Audit Logs
**Route:** `/dashboard/settings/audit-logs`

Table of workspace change history: Action (create/delete/update badges), Entity type, Details (JSON), Date. Fetched from `/api/workspaces/{id}/audit-logs?limit=100`.

### Webhooks
**Route:** `/dashboard/settings/webhooks`

Svix webhook portal embedded as iframe. Full CRUD for endpoints, event subscription, delivery logs. Expire All Sessions button. Dark mode auto-detect.

### Feature Flags
**Route:** `/dashboard/settings/feature-flags`

Workspace-level feature toggles. Scheduled Tasks panel (DO scheduler, auto-refresh 10s). Active Workflows panel (DO workflows, auto-refresh 5s, type/status/progress).

---

## API Docs

**Route:** `/docs` (also under "Developers" section of sidebar)

Full API reference with interactive curl examples. Covers:

### v2 API (current)
- `GET /api/v2/links` — list links
- `POST /api/v2/links` — create link
- `GET /api/v2/links/:id` — get link
- `PATCH /api/v2/links/:id` — update link
- `DELETE /api/v2/links/:id` — delete link
- `GET /api/v2/analytics/overview` — analytics summary
- `GET /api/v2/analytics/breakdown` — dimension breakdown
- `GET /api/v2/analytics/timeseries` — time-series data
- `GET /api/v2/analytics/top-links` — top-performing links
- `GET /api/v2/qr` — generate QR code
- `GET /api/v2/workspace` — get workspace info
- `PATCH /api/v2/workspace` — update workspace
- `GET /api/v2/keys` — list API keys
- `POST /api/v2/keys` — create API key
- `DELETE /api/v2/keys/:id` — revoke API key

### Analytics Engine (Cloudflare)
- `POST /api/analytics/engine` — **NEW** Query Cloudflare Workers Analytics Engine via SQL. Clerk-authenticated. Accepts `{ query: "SELECT ..." }`.

### AI Endpoints
- `POST /api/ai/check-links` — AI batch link checker
- `POST /api/ai/analytics-query` — natural language AI analysis
- `POST /api/ai/enrich-link` — auto-fill link metadata
- `POST /api/ai/optimize-ab` — optimize A/B test weights
- `POST /api/ai/suggest-slug` — generate slug suggestions

### Domain Management
- `POST /api/domains` — add domain
- `POST /api/domains/:id/verify` — verify DNS
- `POST /api/domains/:id/revalidate` — revalidate SSL

### Link Safety
- `GET /api/url-scanner/links` — list scanned links
- `GET /api/url-scanner/links/:linkId/details` — scan details
- `POST /api/url-scanner/refresh/:linkId` — trigger rescan
- `GET /api/url-scanner/screenshot/:scanId` — **UPDATED** serve screenshot from R2 (with legacy base64/bytea fallback)
- `GET /api/url-scanner/abuse` — flagged links (admin)
- `POST /api/url-scanner/abuse` — block/unblock/rescan actions

### Internal APIs
- `POST /api/internal/clicks` — click recording (used by Worker → Analytics Engine bridge)

### Webhook Endpoints
- `POST /api/webhooks/clerk` — Clerk user events
- `POST /api/webhooks/dodo` — Dodo Payments events

---

## Alerting & Cron

| Cron | Schedule | Endpoint | Purpose |
|------|----------|----------|---------|
| A/B Test Check | Daily | `POST /api/cron/ab-test-check` | Auto-finalize A/B tests with statistical significance |
| Weekly Digest | Weekly | `POST /api/cron/weekly-digest` | Send weekly analytics summary email |
| Scanner Rescan | Every 6h | `POST /api/internal/url-scanner/rescan-due` | Re-scan links due for re-evaluation |
| Scanner Retention | Daily | `POST /api/internal/url-scanner/retention` | Purge old scan data |
| Worker Scheduler | On-demand | `POST /api/internal/scheduler` | Durable Objects scheduled task runner |
| Bio Events | On click | `POST /api/internal/bio-events` | Bio page click tracking |

---

## Cloudflare Integration

### Workers Analytics Engine

**Status: ✅ Active (P0 - June 2026)**

Click-time-series data (counts over time) written to Cloudflare Workers Analytics Engine.

**Write path:**
- Worker (`apps/worker/`) writes on every click redirect at route `s/[slug]`
- Vercel-side click handler (`src/app/s/[slug]/route.ts`) forwards to Worker's `/internal/click` endpoint for Vercel-deployed redirects

**Read path:**
- Dashboard proxies SQL queries through `POST /api/analytics/engine` (Clerk-authenticated)
- Replaces the previous Postgres INSERT for click tracking (those writes are removed)

**Worker bindings:**
```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"
dataset = "pivoturl_clicks"
```

### R2 Object Storage

**Status: ✅ Active (P0 - June 2026)**

Two uses:

**1. Gallery/Upload Images** (`src/lib/r2.ts`)
- Images uploaded via `POST /api/gallery/upload` are stored in R2 bucket
- Data column stores `r2:<key>` prefix; legacy base64 data still served as fallback
- Serve via `GET /api/gallery/assets/[id]` (R2 proxy with cache headers)
- Migration script: `scripts/migrate-images-to-r2.ts`

**2. URL Scanner Screenshots**
- Screenshots stored in R2 with `r2Key` column in `scanScreenshots` table
- `bytes` column made nullable (migration `0016_equal_chronomancer.sql`)
- Serve via `GET /api/url-scanner/screenshot/[scanId]` (R2 → legacy fallback)
- Migration script: `scripts/migrate-screenshots-to-r2.ts`

**Client:** S3-compatible `@aws-sdk/client-s3` configured for Cloudflare R2 endpoints.

**Configuration:**
- `CLOUDFLARE_R2_ENDPOINT` — `https://<accountid>.r2.cloudflarestorage.com`
- `CLOUDFLARE_R2_ACCESS_KEY_ID` — R2 API token
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` — R2 API token secret
- `CLOUDFLARE_R2_BUCKET` — bucket name

### Durable Objects

Used for real-time WebSocket connections:
- `analytics-ws` — live click feed per link
- `abtest` — live A/B test results
- `qr` — live QR scan stream
- Scheduler + Workflow system

### URL Scanner

Cloudflare URL Scanner provides:
- Malicious/phishing detection per link
- Screenshot capture (stored in R2)
- DOM analysis, technology detection, redirect chain analysis
- Performance metrics (TTFB, FCP, Load)
- HAR download

### Radar

Cloudflare Radar Rank data displayed per link in safety checker.

---

## Architecture

### Data Flow: Link Click

```
Visitor clicks s/[slug]
        │
        ▼
┌───────────────────┐     ┌──────────────────────┐
│  Worker (deployed) │────▶│ Workers Analytics    │
│  apps/worker/      │     │ Engine (time-series) │
│  s/[slug] redirect │     └──────────────────────┘
└───────┬───────────┘
        │ (or Vercel if Worker not resolving)
        ▼
┌───────────────────┐
│  Vercel s/[slug]  │────▶│ Worker /internal/click
│  (fallback)       │     │ (for Analytics Engine bridge)
└───────┬───────────┘
        │
        ├──▶ Redis (real-time feed, last 50 clicks)
        ├──▶ PostHog (product analytics)
        └──▶ Billing usage tracking
```

### Data Flow: Image/Asset Serve

```
GET /api/gallery/assets/[id]
        │
        ▼
┌───────────────────┐
│ Check data column │
├───────────────────┤
│ r2: prefix?       │──▶ Fetch from Cloudflare R2
│ base64 data?      │──▶ Decode and serve inline
└───────────────────┘
```

### Data Flow: Screenshot Serve

```
GET /api/url-scanner/screenshot/[scanId]
        │
        ▼
┌───────────────────┐
│ r2Key present?    │──▶ Fetch from Cloudflare R2
│ bytes column?     │──▶ Serve from legacy bytea
└───────────────────┘
```

### Worker Architecture

Two workers historically existed:

| Worker | Location | Status |
|--------|----------|--------|
| **pivoturl-worker** | `apps/worker/` | ✅ Active, deployed on Cloudflare |
| linkforge (legacy) | `worker/` | 🗑️ Deleted (June 2026) — zero references remaining |

### Deployment

- **Frontend + API:** Vercel (Next.js App Router)
- **Workers:** Cloudflare Workers (`apps/worker/`)
- **Database:** Neon Postgres (via Drizzle ORM)
- **Real-time:** Redis (Upstash) + Cloudflare Durable Objects
- **Auth:** Clerk
- **Payments:** Dodo Payments
- **Storage:** Cloudflare R2 (images, screenshots) — with legacy base64/bytea fallback
- **Time-series:** Cloudflare Workers Analytics Engine
- **Email:** Resend
- **Webhooks:** Svix

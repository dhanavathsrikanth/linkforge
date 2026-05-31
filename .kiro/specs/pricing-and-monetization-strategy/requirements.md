# Requirements Document

## Introduction

This spec defines the pricing structure, plan limits, paywall mapping, unit economics, and break-even targets for PivotURL. It is the source of truth for any subsequent code change to plans, paywalls, billing, or marketing pricing pages.

PivotURL is a link management platform with a feature surface that spans short links, custom domains, smart routing, deep linking, A/B testing, conversion tracking, multi-touch attribution, bio pages, QR codes, URL safety scanning with Trust Score, public REST API, webhooks via Svix, browser extension, and an npm SDK.

Today's pricing has six tiers (Free, Starter, Growth, Agency, Business, Enterprise) defined in `src/lib/billing/plans.ts`, with a parallel and conflicting definition in `src/lib/billing/planLimits.ts`. The marketing page renders all six tiers in a single grid.

Two competitive pressures force a redesign:

1. Dub.co's 2026 pricing collapsed to four self-serve tiers (Pro $25, Business $75, Advanced $250, Enterprise) with conversion tracking gated at $75. PivotURL's six tiers and softer paywalls are losing on both clarity and price.
2. Bitly's free tier was gutted to 10 links/mo with interstitials, pushing the entire prosumer wedge into the market for a credible alternative.

The proposed structure collapses to Free / Pro $19 / Business $59 / Enterprise, moves several already-built but unmonetized capabilities (multi-touch attribution, smart routing, deep linking, password protection) behind paywalls, fixes a critical revenue-leak bug where Free users can attach unlimited custom domains, and meters AI usage to convert it from a runaway cost into a billable lever.

### Goals

- Maximize blended contribution margin per paid customer.
- Push the Pro to Business mix toward 30/70 over 12 months.
- Reduce Free-tier marginal cost to less than or equal to $0.10 per user per month.
- Beat Dub.co on every published price comparison while preserving 75% or higher gross margin on Pro and Business.
- Eliminate the dual source of truth for plan limits.
- Make the upgrade path obvious from in-product UX.

### Non-goals

- Building affiliate or partner program tooling (Dub owns that category).
- Adding influencer marketplace or social-media management features.
- Per-seat pricing on entry tiers (explicitly rejected).
- Charging for the public SDK or browser extension.
- Solving SOC2 Type II in this spec (separate workstream, prerequisite for Enterprise floor lift to $1,000/mo).

### Unit Economics Summary

| Plan | List | Net rev | Marginal cost | Contribution margin | GM % |
|---|---|---|---|---|---|
| Free | $0 | $0 | $0.08 | -$0.08 | n/a (loss leader) |
| Pro $19 (annual) | $19 | $18.42 | $2.57 | $15.85 | 86% |
| Business $59 (annual) | $59 | $57.26 | $14.47 | $42.79 | 75% |
| Enterprise $499 floor | $499 | $484.50 | $284 | $200 | 41% |
| Enterprise $2K typical | $2,000 | $1,941 | $295 | $1,646 | 85% |

Blended CM at base mix (78% Pro / 20% Business / 2% Enterprise): $24.93 per paid customer per month.

Break-even: ~60 paid customers (solo founder, no salary), ~481 (bootstrap +1 contractor), ~1,604 (3-person funded team), ~4,011 (6-person mid-stage).

## Glossary

- **CM (Contribution Margin):** Net revenue minus direct marginal cost per customer. Excludes fixed overhead.
- **GM (Gross Margin):** CM divided by net revenue, expressed as a percentage.
- **LTV (Lifetime Value):** CM multiplied by average customer lifetime in months.
- **CAC (Customer Acquisition Cost):** Total sales and marketing spend divided by paid customers acquired.
- **Plan key:** The internal identifier (`free`, `pro`, `business`, `enterprise`) used in `planEnum` and the `PLANS` map.
- **Limit:** A numeric cap (links per month, clicks per month, custom domains, etc.) enforced at runtime by `checkLimit()`.
- **Feature gate:** A boolean capability check (A/B testing, conversion tracking, white-label) enforced via `getEffectiveLimits()`.
- **Usage override:** A per-workspace row in `usage_overrides` that supersedes plan defaults, used to grandfather customers and negotiate enterprise deals.
- **White-label:** Removal of "Powered by PivotURL" branding and use of the customer's own custom domain on bio pages and interstitials.
- **Trial:** A 14-day automatic Pro-tier grant on signup, tracked via `workspaces.trialEndsAt`, with no credit card required.
- **Mix:** The percentage distribution of paid customers across tiers (e.g. base mix is 78/20/2).
- **Pro overage:** Click volume above plan cap, billed at $5 per 10,000 clicks rather than blocked.
- **Add-on:** A separate Dodo product purchasable in addition to a base plan (e.g. white-label at $20/mo on Business).

## Requirements

### Requirement 1: Single source of truth for plans

**User Story:** As an engineer maintaining billing logic, I want all plan definitions to live in one file so that runtime checks and marketing UI can never disagree.

#### Acceptance Criteria

1. WHEN a developer looks for plan limits THEN the codebase SHALL expose them only from `src/lib/billing/plans.ts`.
2. WHEN `planLimits.ts` is referenced anywhere in the codebase THEN it SHALL either be deleted or be a thin re-export of `plans.ts`.
3. WHEN a Drizzle migration runs THEN the `planEnum` SHALL contain exactly `free | pro | business | enterprise`.
4. WHEN existing users have plans `starter` or `growth` THEN they SHALL be migrated to `pro`.
5. WHEN existing users have plan `agency` THEN they SHALL be migrated to `business`.
6. WHEN existing users have plan `business` THEN they SHALL retain `business` and SHALL receive a `usage_overrides` row preserving their legacy limits for 12 months.
7. WHEN any code path checks plan-tier behavior THEN it SHALL go through `getEffectiveLimits()` or `checkLimit()` and SHALL NOT use inline `plan === "..."` string comparisons.

### Requirement 2: Free tier hardening

**User Story:** As a founder, I want the Free tier to cost less than or equal to $0.10 per user per month so that 100K free users does not cost more than $10K per month of acquisition.

#### Acceptance Criteria

1. WHEN a Free workspace attempts to add a custom domain THEN the request SHALL fail with a `BILLING_LIMIT_EXCEEDED` 402 response naming `customDomains` and `upgradeTo: "pro"`.
2. WHEN a Free workspace creates a link THEN the workspace's monthly link counter SHALL be checked against the cap of 50.
3. WHEN a Free workspace receives clicks THEN clicks beyond 1,000 per month SHALL still redirect successfully but SHALL NOT be persisted to the `clicks` table (analytics only show capped data).
4. WHEN a Free workspace's URL scan ceiling is checked THEN it SHALL be 10 per day (down from current 50 per day).
5. WHEN a Free workspace creates a webhook endpoint via Svix THEN the request SHALL fail with a 402 `FEATURE_NOT_AVAILABLE` response.
6. WHEN a Free workspace's API key is used THEN the rate limit SHALL be 60 per minute (3,600 per hour) and SHALL be enforced via Upstash rate-limiter.
7. WHEN a new signup occurs from an IP in a flagged country THEN the workspace SHALL require phone verification before its first link is created.

### Requirement 3: Pro tier paywall mapping

**User Story:** As a marketing-led startup, I want to upgrade to Pro to unlock the features Dub charges $75 for, so that I get a better deal at $19.

#### Acceptance Criteria

1. WHEN a Pro workspace creates an A/B test THEN the request SHALL succeed.
2. WHEN a Free workspace attempts to enable A/B testing THEN the request SHALL fail with `FEATURE_NOT_AVAILABLE` and `upgradeTo: "pro"`.
3. WHEN a Pro workspace tracks a conversion event THEN the API SHALL accept the event for last-touch attribution.
4. WHEN a Free workspace tracks a conversion event THEN the API SHALL reject with `FEATURE_NOT_AVAILABLE`.
5. WHEN a Pro workspace defines smart-routing rules (geo, device, language) THEN the worker SHALL evaluate them at redirect time.
6. WHEN a Free workspace attempts to define routing rules THEN the API SHALL reject with `FEATURE_NOT_AVAILABLE`.
7. WHEN a Pro workspace configures iOS or Android destination fields THEN the worker SHALL serve them via Universal Links or App Links.
8. WHEN a Free workspace attempts to set platform-specific destinations THEN the API SHALL reject.
9. WHEN a Pro workspace sets a password, click-limit, expiry, or scheduled date THEN the link SHALL enforce them.
10. WHEN a Free workspace attempts to set click-limit, expiry, or scheduled date THEN the API SHALL reject.
11. WHEN a Pro workspace creates the 4th custom domain THEN the API SHALL reject and the UI SHALL surface an `UpgradeModal` with `upgradeTo: "business"`.
12. WHEN a Pro workspace invites the 4th teammate THEN the API SHALL reject with `BILLING_LIMIT_EXCEEDED` and the UI SHALL surface an `UpgradeModal` with `upgradeTo: "business"`.
13. WHEN a Pro workspace creates the 4th bio page THEN the API SHALL reject.
14. WHEN a Pro workspace's monthly click counter exceeds 50,000 THEN clicks SHALL continue to be tracked and excess SHALL be billed at $5 per 10,000 at end of cycle.
15. WHEN a Pro workspace's API key is used THEN the rate limit SHALL be 600 per minute (36,000 per hour).

### Requirement 4: Business tier paywall mapping

**User Story:** As an SMB or small agency, I want to upgrade to Business to unlock multi-touch attribution, multi-workspace, audit log export, and 25 custom domains.

#### Acceptance Criteria

1. WHEN a Business workspace queries multi-touch attribution models (linear, time-decay, position-based, U-shaped) THEN the API SHALL return results.
2. WHEN a Pro workspace queries any model other than last-touch THEN the API SHALL reject with `FEATURE_NOT_AVAILABLE` and `upgradeTo: "business"`.
3. WHEN a Business workspace exports audit logs THEN the export SHALL be permitted.
4. WHEN a Pro workspace attempts to export audit logs THEN the API SHALL reject.
5. WHEN a Business workspace creates additional workspaces THEN up to 5 SHALL be allowed.
6. WHEN a Business workspace activates the white-label add-on THEN bio pages and interstitials SHALL not show "Powered by PivotURL".
7. WHEN a Business workspace's API key is used THEN the rate limit SHALL be 3,000 per minute.
8. WHEN a Business workspace creates a webhook endpoint THEN up to 25 SHALL be allowed.
9. WHEN a Business workspace's monthly click counter exceeds 500,000 THEN clicks SHALL continue tracking and excess SHALL be billed at $5 per 10,000.

### Requirement 5: Enterprise tier

**User Story:** As IT or security at a mid-market company, I want SSO/SAML, audit log SIEM streaming, custom DPA, and a 99.9% SLA so that PivotURL passes our procurement review.

#### Acceptance Criteria

1. WHEN an Enterprise workspace is configured for SAML SSO via Clerk THEN sign-in SHALL be enforced via the customer's IdP.
2. WHEN an Enterprise workspace requests a SCIM endpoint URL THEN provisioning SHALL be available.
3. WHEN an Enterprise workspace configures audit log SIEM streaming THEN audit log entries SHALL be forwarded to the configured destination.
4. WHEN Enterprise pricing is quoted THEN the floor SHALL be $1,000 per month annual contract.
5. WHEN an Enterprise workspace exceeds any limit THEN behavior SHALL follow the negotiated `usage_overrides` row.

### Requirement 6: Pricing page

**User Story:** As a prospective customer, I want to see four clear plans with annual pricing by default so that I can decide quickly without scrolling through a 30-row feature matrix.

#### Acceptance Criteria

1. WHEN a visitor loads `/pricing` THEN the page SHALL render exactly 4 tiers: Free, Pro, Business, Enterprise.
2. WHEN the page loads THEN the annual/monthly toggle SHALL default to annual.
3. WHEN a tier card is rendered THEN it SHALL surface: price (annual prominent, monthly secondary), top 3 limits, top 3 differentiated features, single CTA. No more.
4. WHEN the "Most popular" badge is rendered THEN it SHALL be on the Pro card (not Business).
5. WHEN a visitor scrolls below the cards THEN a "Compare all features" expandable section MAY render the full feature matrix.
6. WHEN the visitor is signed in THEN the CTA SHALL launch Dodo checkout for that plan; otherwise it SHALL link to signup.

### Requirement 7: In-product upgrade triggers

**User Story:** As a Free or Pro user hitting a limit, I want to see exactly which plan unlocks what I need and how much it costs, so that I can upgrade without leaving my workflow.

#### Acceptance Criteria

1. WHEN any limit reaches 70% utilization THEN a `UsageBanner` component SHALL render on the dashboard with current usage.
2. WHEN any limit reaches 90% utilization THEN the banner SHALL switch to "warning" styling and name the next plan.
3. WHEN any limit reaches 100% utilization THEN the banner SHALL switch to "blocked" styling with an `UpgradeModal` CTA.
4. WHEN a Free user clicks "Add custom domain" THEN the `UpgradeModal` SHALL open with `upgradeTo="pro"` and `feature="custom domains"`.
5. WHEN a Pro user clicks "Invite member" for a 4th seat THEN the `UpgradeModal` SHALL open with `upgradeTo="business"` and `feature="larger team"`.
6. WHEN a Pro user opens the multi-touch attribution dashboard THEN the model selector for non-last-touch models SHALL be visibly disabled with an inline upgrade CTA.
7. WHEN any `UpgradeModal` is shown OR clicked OR completed THEN PostHog SHALL receive an event named `upgrade_modal_shown`, `upgrade_modal_clicked`, or `upgrade_completed` with `from_plan` and `to_plan` properties.

### Requirement 8: Trial mechanics

**User Story:** As a new user, I want to evaluate Pro for 14 days without entering a credit card so that I can decide whether to pay.

#### Acceptance Criteria

1. WHEN a new workspace is created via the Clerk webhook THEN `workspaces.trialEndsAt` SHALL be set to `now + 14 days`.
2. WHEN `now` is before `trialEndsAt` AND the workspace's plan is `free` THEN `getEffectiveLimits()` SHALL return Pro limits.
3. WHEN `now` is at or after `trialEndsAt` AND no Dodo subscription is active THEN limits SHALL revert to Free without deleting any data.
4. WHEN a workspace is on day 7 of trial THEN a conversion email SHALL be sent via Resend.
5. WHEN a workspace is on day 13 of trial THEN a downgrade-protection email SHALL be sent listing what they will lose.
6. WHEN a Pro subscription is activated during trial THEN the trial SHALL end immediately and billing SHALL begin.

### Requirement 9: AI metering

**User Story:** As a founder, I want every AI call to be accounted for in a per-plan credit bucket so that AI usage cannot run away as a cost center.

#### Acceptance Criteria

1. WHEN `src/lib/ai/client.ts` is invoked THEN it SHALL call a paid metered model (not the free OpenRouter tier).
2. WHEN any AI endpoint (`/api/ai/*`) is called THEN it SHALL atomically decrement an `ai_credits:{workspaceId}:{YYYY-MM}` counter in Redis.
3. WHEN the counter reaches the plan limit (Free 30, Pro 500, Business 5,000) THEN the endpoint SHALL return 402 `BILLING_LIMIT_EXCEEDED` with `limitKey: "aiCredits"`.
4. WHEN a workspace owner purchases an AI top-up pack via Dodo THEN 500 additional credits per $5 SHALL be added to the current month's bucket.
5. WHEN the next calendar month begins THEN the counter key SHALL expire automatically (TTL set to end-of-month on first increment).

### Requirement 10: White-label add-on

**User Story:** As an agency on Business, I want to remove "Powered by PivotURL" from my client's bio pages and short link interstitials for $20 per month extra.

#### Acceptance Criteria

1. WHEN white-label is configured in Dodo THEN it SHALL be a separate product available only to workspaces on the Business plan.
2. WHEN a workspace has an active white-label subscription THEN bio page rendering SHALL NOT include the "Powered by PivotURL" footer.
3. WHEN a workspace has an active white-label subscription THEN short link interstitial pages (password gate, expiry, malicious-warning) SHALL NOT include PivotURL branding.
4. WHEN a workspace cancels Business but retains white-label THEN white-label SHALL be deactivated and bio pages SHALL revert to default branding.

### Requirement 11: Click overage policy

**User Story:** As a Pro or Business customer, I want my links to keep working when I exceed my click cap, with overage billed transparently rather than a hard block.

#### Acceptance Criteria

1. WHEN a workspace exceeds its monthly click cap THEN redirects SHALL continue to work without delay.
2. WHEN clicks exceed the cap THEN excess SHALL be tracked separately in Redis under `usage:{workspaceId}:overage:{YYYY-MM}`.
3. WHEN the workspace owner reaches 100% of cap THEN an email notification SHALL be sent stating the overage rate ($5 per 10,000 clicks).
4. WHEN a billing cycle ends THEN a cron job SHALL post overage line items to Dodo for charging.

### Requirement 12: Storage migration (cost optimization)

**User Story:** As a founder, I want screenshot bytes stored on Cloudflare R2 instead of Postgres so that storage cost is roughly 30 times lower.

#### Acceptance Criteria

1. WHEN a new URL scanner screenshot is captured THEN the bytes SHALL be uploaded to Cloudflare R2 and only the R2 key SHALL be persisted in Postgres.
2. WHEN the screenshot API route is requested THEN it SHALL fetch from R2, not from Postgres `bytea`.
3. WHEN the backfill job runs THEN it SHALL migrate existing rows in batches of 100, verify retrieval, and then null the `bytes` column.
4. WHEN all rows are confirmed migrated THEN the `bytes` column SHALL be dropped via Drizzle migration.

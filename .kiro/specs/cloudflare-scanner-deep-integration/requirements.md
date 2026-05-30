# Requirements Document

## Introduction

LinkForge already integrates the Cloudflare URL Scanner to flag malicious destinations on link creation, gate redirects through an interstitial, and surface verdicts on a `/dashboard/link-safety` page. Today only a tiny subset of the scan response is persisted (`verdicts.overall.malicious` plus a few metadata fields). This feature deepens that integration so the platform consumes the rich payload Cloudflare returns — per-engine verdicts, phishing kit markers, TLS certificates, redirect/page history, network requests, cookies, console logs, technology fingerprints, Cloudflare Radar Rank, ASN/IP intel, and screenshots.

The richer data fuels four user-visible capabilities:

1. A **Trust Score (0–100)** combining multiple signals, displayed alongside the binary safe/malicious badge.
2. A **forensic detail view** per link with screenshot, redirect chain, certificates, technologies, console errors, and IP/ASN intel.
3. **Scan history per link** so degradation over time is visible, audit-friendly, and survives upstream record deletion (Cloudflare drops failed scans after 30 days).
4. **Periodic re-scans** with **`link.safety.degraded` webhooks**, **bulk workspace rescans**, **CSV/JSON safety exports**, an opt-in **public trust badge**, and an **enriched interstitial**.

The existing `url-scanner.ts` client is extended (not rewritten). The existing `safety_verdict` jsonb column continues to hold the latest snapshot for fast read paths; a new `link_safety_scans` table holds full history. Forensic detail and cron rescans are gated behind the existing billing feature-flag system.

## Glossary

- **URL_Scanner_Client**: The TypeScript module at `src/lib/cloudflare/url-scanner.ts` that wraps the Cloudflare URL Scanner v2 HTTP API (submit, result, screenshot, HAR endpoints).
- **Link_Safety_Service**: The service at `src/lib/cloudflare/link-safety.ts` that bridges scan results to the `links` table and now to the scan-history table.
- **Trust_Score_Engine**: A new pure module that computes a 0–100 score and a categorical band ("safe", "low-risk", "suspicious", "malicious") from a normalized scan record.
- **Trust_Score**: An integer 0–100 produced by the Trust_Score_Engine, where higher values mean safer. The score is deterministic given the same input scan.
- **Scan_History_Store**: The `link_safety_scans` Postgres table plus its access layer; persists the full normalized scan body for every scan submitted, regardless of outcome, retained per the project retention policy.
- **Safety_Cron_Worker**: A scheduled job (GitHub Actions or Cloudflare Worker) that re-submits eligible links to the URL Scanner on a configurable cadence per plan tier.
- **Safety_Webhook_Dispatcher**: The component that emits `link.safety.degraded` events through the existing Svix webhook infrastructure when a re-scan worsens a link's verdict.
- **Forensic_View**: The dashboard subpage at `/dashboard/link-safety/[linkId]` that renders screenshot, redirect chain, certificates, technologies, IPs/ASNs, cookies, console errors, and Radar Rank for a single link.
- **Bulk_Rescan_Service**: A workspace-scoped operation that submits up to 100 URLs per Cloudflare bulk request and tracks completion across the batch.
- **Safety_Export_Service**: An on-demand exporter that produces a CSV or JSON safety report for all links in a workspace.
- **Trust_Badge_Service**: The opt-in HTTP endpoint that serves an embeddable SVG/HTML badge representing a link's latest Trust_Score and verdict timestamp.
- **Interstitial_Page**: The existing `/s/[slug]/blocked` warning page rendered when a malicious or suspicious destination is requested.
- **Redirect_Chain**: The ordered list of URLs traversed during a scan (`page.history`), including final URL and HTTP status at each hop.
- **Per_Engine_Verdict**: An entry in `verdicts.engines.*` representing a single detection engine's malicious/clean determination for the scanned URL.
- **Phishing_Kit_Marker**: An entry in `meta.processors.phishing` identifying a known phishing kit fingerprint (e.g., `okta-clone`).
- **Radar_Rank**: The Cloudflare Radar global popularity rank for the destination domain, sourced from `meta.processors.radarRank`.
- **HAR_Archive**: The HTTP Archive document returned by the scanner's network-log endpoint, capturing every request the scanned page made.
- **Plan_Tier**: The user's billing plan (free, pro, business, enterprise) that determines which safety features are accessible.
- **Verdict_Degradation**: A transition where a link's latest verdict band is worse than its previous band, OR the Trust_Score drops by at least the configured threshold between two consecutive successful scans.

## Requirements

### Requirement 1: Capture and Normalize the Full Scan Payload

**User Story:** As a platform operator, I want every Cloudflare scan response stored in a normalized internal shape, so that downstream features (Trust Score, forensic view, history diffs) read from a single, well-defined structure rather than re-parsing raw JSON.

#### Acceptance Criteria

1. WHEN a scan result is fetched from the URL Scanner API, THE URL_Scanner_Client SHALL return a normalized record containing `task`, `page` (including `url`, `country`, `domain`, `ip`, `asn`, `asnName`, `server`, `status`, `history`, `screenshot`, `domStructHash`, `favicon.hash`), `data.requests`, `data.cookies`, `data.globals`, `data.console`, `data.performance`, `meta.processors.domainCategories`, `meta.processors.phishing`, `meta.processors.radarRank`, `meta.processors.wappa`, `lists.ips`, `lists.asns`, `lists.domains`, `lists.hashes`, `lists.certificates`, and `verdicts` (overall and engines).
2. WHEN the URL Scanner response omits any optional field, THE URL_Scanner_Client SHALL set the corresponding normalized field to an empty array, empty object, or `null` and SHALL NOT throw.
3. WHEN normalizing `data.requests`, `data.cookies`, `data.console`, or `data.globals`, THE URL_Scanner_Client SHALL truncate each list to at most 500 entries and SHALL record the original count in a `truncated` field on the normalized record.
4. WHEN normalizing `lists.certificates`, THE URL_Scanner_Client SHALL convert `validFrom` and `validTo` from epoch seconds to ISO 8601 strings.
5. THE URL_Scanner_Client SHALL expose a `getScreenshot(scanId, resolution)` function that returns a binary PNG body and content-type from the Cloudflare screenshots endpoint.
6. THE URL_Scanner_Client SHALL expose a `getHarArchive(scanId)` function that returns a HAR_Archive JSON object from the Cloudflare network-log endpoint.
7. IF the URL Scanner returns a non-2xx response other than 404, THEN THE URL_Scanner_Client SHALL throw an error whose message includes the HTTP status and response body.
8. WHERE bulk submission is requested, THE URL_Scanner_Client SHALL submit up to 100 URLs in a single bulk call and SHALL return a list of submission IDs in the same order as the input URLs.
9. THE URL_Scanner_Client SHALL serialize a normalized scan record to JSON and parse it back into an equivalent normalized scan record (round-trip property), preserving all stored fields and truncation metadata.

### Requirement 2: Persist Full Scan History per Link

**User Story:** As a workspace owner, I want every scan ever performed against my links to be archived, so that I can review degradation trends, satisfy audit requests, and avoid losing context when Cloudflare expires upstream records after 30 days.

#### Acceptance Criteria

1. THE Scan_History_Store SHALL provide a `link_safety_scans` table with columns `id` (uuid pk), `link_id` (uuid fk to `links.id`), `scan_id` (text, the Cloudflare uuid), `submitted_at` (timestamptz), `completed_at` (timestamptz, nullable), `status` (enum: `pending`, `finished`, `failed`, `error`), `trust_score` (integer 0-100, nullable), `verdict_band` (enum: `safe`, `low-risk`, `suspicious`, `malicious`, `unknown`), `normalized_scan` (jsonb), and `raw_truncation` (jsonb).
2. WHEN a scan is submitted via Link_Safety_Service, THE Scan_History_Store SHALL insert a new row with `status = 'pending'` and `scan_id` set to the Cloudflare submission UUID before the submit call returns to the caller.
3. WHEN a pending scan resolves to a finished result, THE Scan_History_Store SHALL update the corresponding row's `status`, `completed_at`, `trust_score`, `verdict_band`, and `normalized_scan` columns in a single transaction.
4. WHEN a pending scan resolves with `status = 'Failed'` or the scanner returns a transport error, THE Scan_History_Store SHALL set the row's `status` to `failed` or `error` respectively and SHALL retain whatever partial normalized payload is available.
5. THE Scan_History_Store SHALL preserve scan rows for at least 365 days regardless of whether the upstream Cloudflare record is still retrievable.
6. THE Link_Safety_Service SHALL continue to write the latest snapshot to `links.safety_verdict`, `links.safety_status`, and `links.safety_scanned_at` for fast read paths, AND SHALL ALSO write the full normalized payload to Scan_History_Store on the same code path.
7. WHEN listing scan history for a link, THE Scan_History_Store SHALL return rows ordered by `submitted_at` descending and SHALL support pagination with a maximum page size of 100.

### Requirement 3: Compute a Deterministic Trust Score

**User Story:** As a workspace owner, I want a single 0–100 Trust Score per link that reflects multiple risk signals, so that I can prioritize review work without parsing raw scan fields.

#### Acceptance Criteria

1. THE Trust_Score_Engine SHALL accept a normalized scan record and return an integer Trust_Score in the inclusive range 0 to 100 and a `verdict_band` of `safe`, `low-risk`, `suspicious`, or `malicious`.
2. THE Trust_Score_Engine SHALL be a pure function such that calling it twice with the same input produces the same Trust_Score and verdict_band (idempotence property).
3. THE Trust_Score_Engine SHALL incorporate at least the following signals, each with a documented weight in the module's source: `verdicts.overall.malicious`, count of malicious Per_Engine_Verdict entries, presence of any Phishing_Kit_Marker, count of expired or self-signed certificates in `lists.certificates`, length of the Redirect_Chain, Radar_Rank bucket of the final domain, and presence of any IP or ASN in a configured high-risk list.
4. WHEN `verdicts.overall.malicious` is `true`, THE Trust_Score_Engine SHALL return a Trust_Score of at most 20 and a verdict_band of `malicious`.
5. WHEN at least one Per_Engine_Verdict is malicious but `verdicts.overall.malicious` is `false`, THE Trust_Score_Engine SHALL return a verdict_band no better than `suspicious`.
6. WHEN every signal indicates a clean destination (no malicious engines, no phishing markers, valid unexpired certificates, redirect chain length ≤ 2, Radar_Rank in the top 100k, no high-risk IP/ASN), THE Trust_Score_Engine SHALL return a verdict_band of `safe`.
7. IF a normalized scan record is missing fields required for a given signal, THEN THE Trust_Score_Engine SHALL treat that signal as neutral and SHALL NOT count it as a positive or negative contribution.
8. THE Trust_Score_Engine SHALL output a `breakdown` array listing each contributing signal, its raw value, its applied weight, and the points it added or subtracted, so the score is explainable in the UI.

### Requirement 4: Multi-Signal Safety Gating

**User Story:** As an end user clicking a LinkForge short link, I want suspicious-but-not-yet-malicious destinations to also trigger the interstitial, so that I am protected against destinations that show warning signs even before any single engine flags them.

#### Acceptance Criteria

1. WHEN a request hits `/s/[slug]` and the link's latest verdict_band is `malicious`, THE Interstitial_Page SHALL be rendered and the redirect SHALL be blocked.
2. WHEN a request hits `/s/[slug]` and the link's latest verdict_band is `suspicious`, THE Interstitial_Page SHALL be rendered with a "proceed at your own risk" affordance and the redirect SHALL NOT occur until the user confirms.
3. WHEN a request hits `/s/[slug]` and the link's latest verdict_band is `safe` or `low-risk`, THE redirect SHALL proceed without an interstitial.
4. WHILE the link's `safety_status` is `pending` and the link is younger than 60 seconds, THE redirect SHALL proceed without an interstitial AND THE Link_Safety_Service SHALL record the impression for later correlation.
5. IF the link's `safety_blocked_by_admin` flag is `true`, THEN THE Interstitial_Page SHALL be rendered regardless of verdict_band and the proceed affordance SHALL be hidden.

### Requirement 5: Enriched Interstitial

**User Story:** As an end user faced with a safety warning, I want to see why the destination was flagged and what it looks like, so that I can make an informed decision about whether to proceed.

#### Acceptance Criteria

1. WHEN the Interstitial_Page is rendered, THE Interstitial_Page SHALL display the destination's screenshot from the URL_Scanner_Client screenshot endpoint, the Trust_Score, the verdict_band, the Redirect_Chain (final URL plus each hop with its HTTP status), and a list of Per_Engine_Verdict entries that flagged the destination.
2. WHEN the screenshot is unavailable from the upstream endpoint, THE Interstitial_Page SHALL render a placeholder graphic and SHALL NOT block the rest of the page from rendering.
3. THE Interstitial_Page SHALL display each Phishing_Kit_Marker by its kit identifier and a human-readable description.
4. WHERE the user's plan tier is free, THE Interstitial_Page SHALL hide the per-engine verdict list and SHALL display only the verdict_band and a generic warning.

### Requirement 6: Forensic Detail View

**User Story:** As a paid-tier workspace owner investigating a flagged destination, I want a single page showing every signal Cloudflare returned, so that I can decide whether the flag is a false positive or a real threat without leaving the dashboard.

#### Acceptance Criteria

1. WHERE the user's plan tier includes the `forensic-detail` feature flag, THE Forensic_View SHALL be accessible at `/dashboard/link-safety/[linkId]`.
2. THE Forensic_View SHALL display the screenshot, the final URL after redirects, the Redirect_Chain, the Trust_Score with its breakdown from Requirement 3, the verdict_band, the full list of detected technologies (`meta.processors.wappa`) with categories and confidence, the TLS certificates from `lists.certificates` with issuer, validity dates, and a warning badge for any certificate expiring within 30 days or self-signed, the IPs and ASNs from `lists.ips` and `lists.asns`, the cookies from `data.cookies`, the scripts loaded from `data.requests`, the console errors from `data.console`, and the Radar_Rank.
3. THE Forensic_View SHALL provide a "Download HAR" button that streams the HAR_Archive returned by `URL_Scanner_Client.getHarArchive`.
4. THE Forensic_View SHALL provide a "View scan history" panel listing the previous 20 scans for the link with their submitted_at, Trust_Score, and verdict_band.
5. WHEN a user without the `forensic-detail` feature flag navigates to `/dashboard/link-safety/[linkId]`, THE Forensic_View SHALL render an upgrade prompt and SHALL NOT load any forensic data.
6. IF the upstream Cloudflare scan record returns 404 (expired) but a Scan_History_Store row exists, THEN THE Forensic_View SHALL render the archived `normalized_scan` from the history table and SHALL display a notice that the upstream record has expired.

### Requirement 7: Periodic Re-scans

**User Story:** As a workspace owner, I want my links re-scanned automatically on a schedule, so that destinations that go bad after I shorten them are caught without manual action.

#### Acceptance Criteria

1. WHERE the workspace's plan tier includes the `cron-rescan` feature flag, THE Safety_Cron_Worker SHALL re-submit each link in the workspace to the URL Scanner on the cadence configured for that plan tier.
2. THE Safety_Cron_Worker SHALL skip any link whose `safety_blocked_by_admin` flag is `true`.
3. THE Safety_Cron_Worker SHALL skip any link whose latest scan completed within the last 24 hours.
4. WHEN the Safety_Cron_Worker re-scans a link, THE Scan_History_Store SHALL receive a new row per Requirement 2.
5. WHEN the Safety_Cron_Worker submits more than 10 URLs in a single workspace pass, THE Safety_Cron_Worker SHALL use the bulk submission path of the URL_Scanner_Client.
6. IF the URL Scanner rate-limits a submission with HTTP 429, THEN THE Safety_Cron_Worker SHALL retry that submission with exponential backoff up to 3 attempts and SHALL record the failure in the Scan_History_Store row if all retries fail.
7. THE Safety_Cron_Worker SHALL emit a structured log entry per workspace pass including links scanned, links skipped, failures, and elapsed time.

### Requirement 8: Verdict-Degradation Webhooks

**User Story:** As a workspace owner integrating LinkForge with my own systems, I want a webhook fired when a previously-safe link turns bad, so that I can react automatically (notify a security channel, disable the link in my product, etc.).

#### Acceptance Criteria

1. WHEN a re-scan completes and produces a Verdict_Degradation, THE Safety_Webhook_Dispatcher SHALL emit a `link.safety.degraded` event through the existing Svix client.
2. THE `link.safety.degraded` event payload SHALL include `link_id`, `slug`, `destination_url`, `previous_trust_score`, `current_trust_score`, `previous_verdict_band`, `current_verdict_band`, `scan_id`, `scanned_at`, and a `reasons` array containing the breakdown entries from Requirement 3 that contributed negative points.
3. THE Safety_Webhook_Dispatcher SHALL fire the event at most once per (link_id, scan_id) pair (idempotence).
4. WHEN the previous and current verdict_bands are identical AND the Trust_Score change is smaller than 15 points, THE Safety_Webhook_Dispatcher SHALL NOT emit an event.
5. IF Svix returns a non-2xx response, THEN THE Safety_Webhook_Dispatcher SHALL log the failure and rely on Svix's own retry mechanism.

### Requirement 9: Bulk Rescan and Safety Export

**User Story:** As a workspace owner doing periodic security review, I want to rescan every link in my workspace on demand and export the results, so that I can produce evidence for compliance reviews and bulk-fix any newly-flagged links.

#### Acceptance Criteria

1. THE Bulk_Rescan_Service SHALL expose a workspace-scoped action that enqueues a rescan of every link in the workspace, batched at 100 URLs per Cloudflare bulk submission.
2. WHEN a bulk rescan is initiated, THE Bulk_Rescan_Service SHALL return a job identifier the client can poll for progress (`total`, `submitted`, `completed`, `failed`).
3. THE Safety_Export_Service SHALL produce a CSV file with columns `link_id`, `slug`, `destination_url`, `trust_score`, `verdict_band`, `last_scanned_at`, `malicious_engines`, `phishing_markers`, and `final_url` for every link in the workspace.
4. THE Safety_Export_Service SHALL produce a JSON file containing one object per link with the same fields as the CSV plus the latest `normalized_scan` payload.
5. WHEN a CSV export contains a destination URL, slug, or any other field that begins with `=`, `+`, `-`, or `@`, THE Safety_Export_Service SHALL prefix the field with a single quote to neutralize spreadsheet formula injection.
6. WHERE the workspace contains more than 10000 links, THE Safety_Export_Service SHALL stream the response rather than buffer it in memory.

### Requirement 10: Public Trust Badge

**User Story:** As a creator with a LinkForge bio page, I want to opt into displaying a "Cloudflare-verified safe" badge with a verification timestamp on my public page, so that visitors trust the links I share.

#### Acceptance Criteria

1. THE Trust_Badge_Service SHALL expose an HTTP endpoint that returns an SVG badge for a given link or bio page, displaying the verdict_band and the `last_scanned_at` timestamp formatted as a relative date.
2. WHERE the link or bio owner has not enabled the `public-trust-badge` opt-in toggle, THE Trust_Badge_Service SHALL return HTTP 404.
3. WHEN the latest verdict_band is `malicious` or `suspicious`, THE Trust_Badge_Service SHALL refuse to render a "verified safe" badge and SHALL return HTTP 410 Gone.
4. THE Trust_Badge_Service SHALL set `Cache-Control: public, max-age=300` on successful badge responses.
5. THE Trust_Badge_Service SHALL also expose an embeddable HTML snippet that renders the SVG badge with an `<a>` link to a public proof page showing the latest scanned_at and verdict_band.

### Requirement 11: Plan-Tier Gating

**User Story:** As the LinkForge product owner, I want forensic detail and cron rescans gated behind paid plans, so that the costlier features are tied to paid tiers.

#### Acceptance Criteria

1. THE Link_Safety_Service SHALL read plan-tier feature flags from the existing billing module to decide whether `forensic-detail`, `cron-rescan`, `bulk-rescan`, `safety-export`, and `public-trust-badge` are available for a given workspace.
2. WHEN a user without the `forensic-detail` feature flag attempts to access the Forensic_View, THE Forensic_View SHALL return an upgrade prompt per Requirement 6.5.
3. WHEN a user without the `cron-rescan` feature flag attempts to enable scheduled rescans, THE Link_Safety_Service SHALL return HTTP 402 with a structured error code `plan_upgrade_required`.
4. WHEN a user without the `bulk-rescan` feature flag invokes the Bulk_Rescan_Service, THE Bulk_Rescan_Service SHALL return HTTP 402 with the structured error code `plan_upgrade_required`.

### Requirement 12: Storage Caps and Retention

**User Story:** As a platform operator, I want predictable storage costs for scan archives, so that the deep integration does not balloon database size as scan volume grows.

#### Acceptance Criteria

1. THE Scan_History_Store SHALL cap each persisted `normalized_scan` document at 1 MiB and SHALL truncate `data.requests`, `data.cookies`, `data.console`, and `data.globals` to 500 entries each per Requirement 1.3.
2. WHEN a normalized scan exceeds 1 MiB after the per-list truncation, THE Scan_History_Store SHALL drop `data.globals` first, then `data.performance`, then `data.console` until the document fits, recording each dropped section in the `raw_truncation` jsonb column.
3. THE Scan_History_Store SHALL retain successful and failed scan rows for at least 365 days and SHALL provide a maintenance task that deletes rows older than the configured retention threshold.
4. WHILE retention deletion runs, THE Scan_History_Store SHALL preserve at minimum the most recent 5 scan rows per link regardless of age.
5. THE Scan_History_Store SHALL never store screenshot or HAR_Archive blobs in the database; THE URL_Scanner_Client SHALL stream those resources on demand from Cloudflare or, where the operator opts in, from a configured object-storage bucket.

# Requirements Document

## Introduction

LinkForge currently consumes only a small subset of the Cloudflare URL Scanner Get Scan Report payload (a malicious boolean and a few metadata fields). The Enhanced URL Scanner Intelligence feature expands the platform's use of the scanner so that a single scan delivers a Trust Score, a technology fingerprint, a redirect-chain visualization, screenshot proof, suspicious-asset analysis, similarity search, scheduled rescans, customer-facing webhooks, a visitor preview page, an internal abuse dashboard, and a public Trust API. The feature also defines plan-tier gating, retention policies for large scan artifacts, cost controls, and correctness properties suitable for property-based testing.

This feature builds on the existing URL Scanner client (`src/lib/cloudflare/url-scanner.ts`), the `links.safety_*` columns, the redirect interstitial at `/s/[slug]/blocked`, and the `/dashboard/link-safety` page. It does not replace those; it extends them.

## Glossary

- **LinkForge**: The multi-tenant short link platform (this product) that owns the database, dashboards, and APIs described in this document.
- **URL_Scanner_Service**: LinkForge's internal abstraction over the Cloudflare URL Scanner API. Implemented at `src/lib/cloudflare/url-scanner.ts` plus `src/lib/cloudflare/link-safety.ts` and extended by this feature.
- **Cloudflare_URL_Scanner**: The external Cloudflare service that produces scan reports.
- **Scan_Report**: A normalized record persisted by LinkForge derived from one Cloudflare scan, containing fields drawn from `task`, `page`, `data`, `meta`, `lists`, and `verdicts`.
- **Trust_Score**: An integer in the closed interval [0, 100] computed deterministically from a Scan_Report, where higher is more trustworthy.
- **Trust_Band**: One of `unknown`, `low`, `medium`, `high`, `verified`, derived from Trust_Score.
- **Trust_Score_Engine**: The pure function and surrounding service that computes Trust_Score and Trust_Band from a Scan_Report.
- **Asset_Risk_Analyzer**: The component that scans `data.requests`, `data.cookies`, `data.globals`, `data.console`, and `lists.domains` from a Scan_Report and produces zero or more `AssetRiskFlag` records.
- **AssetRiskFlag**: A typed warning emitted by Asset_Risk_Analyzer (e.g., `crypto_miner`, `fingerprinter`, `excessive_third_party_cookies`, `suspicious_global`, `console_error_burst`).
- **Redirect_Chain**: The ordered list of hops derived from `page.history` of a Scan_Report.
- **Tech_Stack**: The detected technology fingerprint derived from `meta.processors.wappa`.
- **Domain_Reputation_Panel**: A workspace dashboard view that aggregates Scan_Report data per destination registrable domain.
- **Rescan_Scheduler**: The cron-based component that selects links and enqueues new scans on a cadence based on Trust_Band and previous result.
- **Safety_Webhook_Service**: The component that fires webhook events through the existing Svix integration when safety state changes.
- **Visitor_Preview_Page**: The public page at `/s/[slug]/preview` that shows a destination's screenshot, Trust_Band, and Tech_Stack before the visitor clicks through.
- **Trust_Badge**: The opt-in visual badge rendered on the interstitial and the Visitor_Preview_Page that summarizes Trust_Band.
- **Trust_API**: The public read-only HTTP API at `GET /api/v1/safety/check` that returns a Trust_Score and verdict for a submitted URL, gated by API key and plan.
- **Abuse_Dashboard**: The internal admin view that lists flagged links across one workspace (workspace admins) or across all workspaces (platform admins).
- **Plan**: The workspace's billing tier; one of `free`, `starter`, `growth`, `agency`, `business`, `enterprise`.
- **Scan_Artifact**: A large binary or near-binary asset associated with a Scan_Report — specifically the screenshot image and the HAR JSON.
- **Retention_Service**: The component that enforces age-based deletion of Scan_Artifacts and historical Scan_Reports per the retention policy.
- **Workspace_Admin**: A workspace member with role `owner` or `admin`.
- **Platform_Admin**: A LinkForge staff user with the platform-level admin claim.

## Requirements

### Requirement 1: Persist Full Scan Reports

**User Story:** As a workspace owner, I want LinkForge to retain the rich fields from each scan, so that downstream features can read them without re-calling Cloudflare.

#### Acceptance Criteria

1. WHEN the URL_Scanner_Service receives a finished scan from Cloudflare_URL_Scanner, THE URL_Scanner_Service SHALL persist a Scan_Report row containing the source link id, scan id, fetched timestamp, raw response payload, normalized fields, and a schema version integer.
2. THE URL_Scanner_Service SHALL store the following normalized fields on each Scan_Report: page URL, final URL, page IP, page ASN, page country, server header, redirect chain (ordered hop list with status codes), DOM structure hash, favicon hash, screenshot hash, contacted IPs, contacted ASNs, contacted domains, certificate issuers and validity windows, domain categories, phishing kit name (nullable), Cloudflare Radar Rank (nullable), and detected technologies.
3. WHEN a new Scan_Report is persisted for a given link id, THE URL_Scanner_Service SHALL preserve previous Scan_Report rows for that link rather than overwriting them.
4. WHEN the latest Scan_Report for a link is persisted, THE URL_Scanner_Service SHALL update the link row's `safety_status`, `safety_scan_id`, `safety_scanned_at`, and `safety_verdict` columns to reflect that report.
5. IF Cloudflare_URL_Scanner returns a payload that fails schema validation, THEN THE URL_Scanner_Service SHALL persist a Scan_Report with status `error`, store the validation error message, and leave the previous link `safety_status` unchanged.
6. IF a scan submission does not result in a successfully received and processed Cloudflare response, THEN THE URL_Scanner_Service SHALL leave the previous link `safety_status` unchanged.
7. THE URL_Scanner_Service SHALL store at most one in-flight scan per link id at any moment.

### Requirement 2: Compute Trust Score

**User Story:** As a workspace member, I want each link to have a single Trust Score number, so that I can quickly assess destination safety without reading every field.

#### Acceptance Criteria

1. WHEN a Scan_Report transitions to status `finished`, THE Trust_Score_Engine SHALL compute a Trust_Score in the closed interval [0, 100] from that Scan_Report.
2. THE Trust_Score_Engine SHALL be a pure function of the Scan_Report and a versioned weight table, producing the same Trust_Score for the same input every time, where the Scan_Report's stored weight-table version is set to equal the current version only after computation completes.
3. WHEN the Cloudflare verdict `verdicts.overall.malicious` is true, THE Trust_Score_Engine SHALL produce a Trust_Score in the closed interval [0, 20].
4. WHEN `meta.processors.phishing` is non-empty, THE Trust_Score_Engine SHALL produce a Trust_Score in the closed interval [0, 30].
5. WHEN the redirect chain length exceeds 5 hops, THE Trust_Score_Engine SHALL subtract at least 10 points from the Trust_Score before clamping to [0, 100].
6. WHEN any TLS certificate in the Scan_Report is expired at the time of computation, THE Trust_Score_Engine SHALL subtract at least 15 points before clamping.
7. WHEN `meta.processors.radarRank` is present and indicates a top-100,000 domain, THE Trust_Score_Engine SHALL add at least 5 points before clamping.
8. WHEN the Trust_Score_Engine completes a Trust_Score computation for a Scan_Report, THE Trust_Score_Engine SHALL persist the Trust_Score, the Trust_Band, and the weight-table version onto that Scan_Report row.
9. THE Trust_Score_Engine SHALL map Trust_Score to Trust_Band using the boundaries: 0–24 `low`, 25–49 `medium`, 50–79 `high`, 80–100 `verified`, with `unknown` reserved for links that have no finished Scan_Report.
10. WHEN the weight table version stored on a Scan_Report differs from the current version, THE Trust_Score_Engine SHALL recompute the Trust_Score on the next read and persist the new value before returning it.

### Requirement 3: Surface Trust Score in Existing UIs

**User Story:** As a workspace member, I want the Trust Score visible everywhere a link appears, so that safety context follows the link without extra clicks.

#### Acceptance Criteria

1. THE LinkForge dashboard link list SHALL render the Trust_Band and numeric Trust_Score for every link that has a finished Scan_Report.
2. THE LinkForge link detail page SHALL render the Trust_Score, the Trust_Band, the contributing factors (verdict, phishing kit, redirect length, TLS validity, Radar Rank), and the timestamp of the underlying Scan_Report.
3. WHEN a link has Trust_Band `low` OR `medium`, THE redirect interstitial at `/s/[slug]/blocked` SHALL display the Trust_Score and the top three contributing factors.
4. THE existing `/dashboard/link-safety` stat cards SHALL include a new card showing the count of links per Trust_Band for the active workspace.

### Requirement 4: Reveal Detected Technology Stack

**User Story:** As a workspace member, I want to see what technologies a destination uses, so that I can vet third-party dependencies before sharing the link.

#### Acceptance Criteria

1. WHERE a workspace's Plan permits the Tech_Stack feature, THE LinkForge link detail page SHALL render the Tech_Stack grouped by Wappalyzer category (e.g., CMS, Analytics, Payment).
2. THE LinkForge link detail page SHALL render each technology as a row containing the name, category, and detected version when the version is present in the Scan_Report.
3. WHERE a workspace's Plan does not permit the Tech_Stack feature, THE LinkForge link detail page SHALL render a Plan upgrade prompt in place of the Tech_Stack panel.
4. WHEN the Tech_Stack list contains zero technologies, THE LinkForge link detail page SHALL render the Tech_Stack panel containing the empty state message "No technologies detected".

### Requirement 5: Visualize Redirect Chain

**User Story:** As a workspace member, I want to see every hop my short link's destination performs, so that I can detect redirect hijacks and tracker chains.

#### Acceptance Criteria

1. THE LinkForge link detail page SHALL render the Redirect_Chain as an ordered list of hops, each row containing hop index, request URL, response status, response IP, and response country.
2. WHEN the Redirect_Chain contains 2 or more entries (i.e., at least one redirect occurred), THE LinkForge link detail page SHALL render a warning banner stating the number of hops.
3. WHEN any hop in the Redirect_Chain crosses a registrable domain boundary that differs from the originally submitted hostname, THE LinkForge link detail page SHALL annotate that hop with a `cross-domain` marker.
4. THE LinkForge link detail page SHALL render the final landing URL distinctly from intermediate hops.

### Requirement 6: Display Screenshot Proof

**User Story:** As a workspace member, I want to see a screenshot of the destination, so that I can verify content without visiting the URL.

#### Acceptance Criteria

1. WHEN a Scan_Report exposes a `page.screenshot` hash, THE URL_Scanner_Service SHALL fetch the screenshot bytes from the Cloudflare screenshot endpoint and persist the bytes in object storage keyed by scan id.
2. WHERE a workspace's Plan permits the screenshot feature, THE LinkForge link detail page SHALL render the persisted screenshot for the latest Scan_Report at a maximum width of 960 pixels.
3. THE URL_Scanner_Service SHALL serve persisted screenshots through a signed URL that expires within 15 minutes of issuance.
4. IF the screenshot fetch returns a non-2xx response, THEN THE URL_Scanner_Service SHALL retry up to 2 additional times with exponential backoff and persist a `screenshot_unavailable` flag on the Scan_Report when all attempts fail.
5. WHERE a workspace's Plan does not permit the screenshot feature, THE LinkForge link detail page SHALL render a blurred placeholder with a Plan upgrade prompt.

### Requirement 7: Domain Reputation Panel

**User Story:** As a workspace owner, I want to see all my links grouped by destination domain, so that I can assess reputation across the workspace.

#### Acceptance Criteria

1. THE Domain_Reputation_Panel SHALL list every distinct registrable destination domain across the active workspace's links, sorted by descending count of links pointing to that domain.
2. THE Domain_Reputation_Panel SHALL display, for each domain row: the domain, the count of workspace links targeting the domain, the most recent Cloudflare verdict, the most recent Trust_Band, the categories list, and the most recent Radar Rank when present.
3. WHEN any link targeting a given domain has Trust_Band `low`, THE Domain_Reputation_Panel SHALL highlight that domain row with a warning style.
4. WHEN the user expands a domain row, THE Domain_Reputation_Panel SHALL render the per-link Trust_Score, the latest scan timestamp, and a link to each member link's detail page.

### Requirement 8: Threat Similarity Search

**User Story:** As a Workspace_Admin, I want LinkForge to flag destinations that resemble known phishing kits, so that I catch threats Cloudflare did not outright block.

#### Acceptance Criteria

1. WHEN a Scan_Report contains a `page.domStructHash` or a `page.screenshot` hash, THE URL_Scanner_Service SHALL invoke the Cloudflare URL Scanner search endpoint using that hash.
2. WHEN the similarity search returns at least one Scan_Report whose `verdicts.overall.malicious` is true, THE URL_Scanner_Service SHALL persist a `similar_to_malicious` flag on the originating Scan_Report containing the matched scan ids and similarity hash.
3. WHEN the `similar_to_malicious` flag is persisted, THE Trust_Score_Engine SHALL subtract at least 25 points from the Trust_Score before clamping.
4. WHEN the similarity search completes without finding any malicious matches, THE Trust_Score_Engine SHALL NOT subtract similarity points.
5. WHERE a workspace's Plan does not permit similarity search, THE URL_Scanner_Service MAY perform the similarity search call for internal observability but SHALL NOT persist the `similar_to_malicious` flag and SHALL NOT subtract similarity points from the Trust_Score.
6. THE URL_Scanner_Service SHALL cache similarity results keyed by hash for at least 24 hours and at most 72 hours.

### Requirement 9: Suspicious Asset Detection

**User Story:** As a workspace member, I want LinkForge to surface suspicious sub-resources loaded by my destinations, so that I notice trackers, miners, and fingerprinters even when the page is not outright malicious.

#### Acceptance Criteria

1. WHEN a Scan_Report transitions to status `finished`, THE Asset_Risk_Analyzer SHALL inspect `data.requests`, `data.cookies`, `data.globals`, `data.console`, and `lists.domains` from the Scan_Report.
2. WHEN any contacted domain matches the bundled crypto-miner blocklist, THE Asset_Risk_Analyzer SHALL emit an `AssetRiskFlag` of type `crypto_miner` referencing the offending domain.
3. WHEN any contacted domain matches the bundled browser-fingerprinter blocklist, THE Asset_Risk_Analyzer SHALL emit an `AssetRiskFlag` of type `fingerprinter` referencing the offending domain.
4. WHEN the count of distinct third-party cookies exceeds 30, THE Asset_Risk_Analyzer SHALL emit an `AssetRiskFlag` of type `excessive_third_party_cookies` containing the count.
5. WHEN any entry in `data.globals` matches a name in the bundled malware-global watchlist, THE Asset_Risk_Analyzer SHALL emit an `AssetRiskFlag` of type `suspicious_global` whose serialized payload contains the matched global name.
6. WHEN the count of console error entries exceeds 20, THE Asset_Risk_Analyzer SHALL emit an `AssetRiskFlag` of type `console_error_burst` containing the count.
7. THE Asset_Risk_Analyzer SHALL persist all emitted AssetRiskFlag records joined to the Scan_Report id.
8. THE LinkForge link detail page SHALL render every AssetRiskFlag for the latest Scan_Report under a "Suspicious assets" panel.

### Requirement 10: Performance Hint

**User Story:** As a workspace member, I want to see how fast a destination loads, so that I can pick faster pages for marketing campaigns.

#### Acceptance Criteria

1. WHEN a Scan_Report contains `data.performance` metrics, THE LinkForge link detail page SHALL render the Time To First Byte, First Contentful Paint, and total load time in milliseconds.
2. WHEN any of the performance metrics is missing from the Scan_Report, THE LinkForge link detail page SHALL render the literal string "—" for that metric.

### Requirement 11: Scheduled Rescans

**User Story:** As a workspace owner, I want LinkForge to rescan my links on a cadence, so that destinations that turn malicious post-creation are detected.

#### Acceptance Criteria

1. THE Rescan_Scheduler SHALL run on a cron at least every 60 minutes.
2. WHEN the Rescan_Scheduler runs, THE Rescan_Scheduler SHALL select links whose latest Scan_Report Trust_Band is `verified` or `high` and whose `safety_scanned_at` is older than 7 days, and SHALL enqueue a rescan for each selected link.
3. WHEN the Rescan_Scheduler runs, THE Rescan_Scheduler SHALL select links whose latest Scan_Report status is `error` or whose `safety_status` is `pending` for at least 1 hour, and SHALL enqueue a rescan for each selected link.
4. WHEN the Rescan_Scheduler runs, THE Rescan_Scheduler SHALL select links whose latest Scan_Report Trust_Band is `low` or `medium` and whose `safety_scanned_at` is older than 24 hours, and SHALL enqueue a rescan for each selected link.
5. THE Rescan_Scheduler SHALL skip links whose owning workspace Plan disallows scheduled rescans.
6. THE Rescan_Scheduler SHALL enqueue at most one in-flight rescan per link at any moment.
7. WHEN a rescan is enqueued for a link, THE Rescan_Scheduler SHALL record the enqueue reason (`age_verified`, `age_low`, `pending_stuck`, `error_retry`) on the resulting Scan_Report.
8. THE Rescan_Scheduler SHALL enqueue at most 1,000 rescans per workspace per 24-hour window.

### Requirement 12: Safety Webhook Events

**User Story:** As a customer integrating with LinkForge, I want webhook events when a link's safety changes, so that my application can react automatically.

#### Acceptance Criteria

1. WHEN a link's Trust_Band transitions from any value other than `low` to `low`, THE Safety_Webhook_Service SHALL fire a webhook event of type `link.flagged_malicious` to the workspace's configured endpoints.
2. WHEN a link's Trust_Band transitions from `low` to any value other than `low`, THE Safety_Webhook_Service SHALL fire a webhook event of type `link.flagged_safe` to the workspace's configured endpoints.
3. WHEN a rescan is enqueued for a link, THE Safety_Webhook_Service SHALL fire a webhook event of type `link.rescan_due` containing the link id and enqueue reason.
4. THE webhook payload for every safety event SHALL include `linkId`, `workspaceId`, `eventType`, `trustScore`, `trustBand`, `verdict`, `scanId`, and `scannedAt`.
5. THE Safety_Webhook_Service SHALL deduplicate consecutive identical safety events for a link such that no two consecutive events fired for that link have the same `eventType` and `trustBand`.

### Requirement 13: Visitor Preview Page

**User Story:** As a public visitor, I want to preview where a short link goes before I click, so that I do not click into hostile content.

#### Acceptance Criteria

1. THE LinkForge public site SHALL serve the Visitor_Preview_Page at the path `/s/[slug]/preview` for every active link.
2. THE Visitor_Preview_Page SHALL render the destination URL, the latest screenshot, the Trust_Badge, the Trust_Band, the Tech_Stack categories, and a "Continue to destination" button.
3. WHERE the link's owning workspace has disabled the public preview opt-in, THE LinkForge public site SHALL NOT serve the Visitor_Preview_Page at `/s/[slug]/preview` for that link, and SHALL respond with HTTP 404.
4. WHERE the link's latest Scan_Report Trust_Band is `low`, THE Visitor_Preview_Page SHALL render the same content displayed at `/s/[slug]/blocked` and respond with HTTP 200.
5. THE Visitor_Preview_Page SHALL NOT execute any tracking pixels or scripts owned by third parties other than the LinkForge analytics endpoint.

### Requirement 14: Trust Badge

**User Story:** As a workspace owner, I want a visual badge that summarizes safety, so that visitors and dashboards can read it at a glance.

#### Acceptance Criteria

1. THE Trust_Badge SHALL render as one of five visual variants corresponding exactly to the five Trust_Band values.
2. THE Trust_Badge SHALL include the numeric Trust_Score, the Trust_Band label, and the timestamp of the underlying Scan_Report.
3. WHEN the Trust_Badge is rendered on the redirect interstitial, THE Trust_Badge SHALL link to the Visitor_Preview_Page for that slug.
4. WHEN the Trust_Badge is rendered without an underlying finished Scan_Report, THE Trust_Badge SHALL display the `unknown` variant and SHALL NOT show a numeric Trust_Score.

### Requirement 15: Internal Abuse Dashboard

**User Story:** As a Workspace_Admin or Platform_Admin, I want a centralized view of flagged links, so that I can respond to abuse quickly.

#### Acceptance Criteria

1. THE Abuse_Dashboard SHALL list every link in the viewer's authorization scope whose Cloudflare verdict is malicious OR whose `safety_blocked_by_admin` is true OR whose latest Scan_Report Trust_Band is `low` AND the Scan_Report carries at least one AssetRiskFlag.
2. WHERE the viewer is a Workspace_Admin, THE Abuse_Dashboard SHALL restrict the listing to links owned by that viewer's workspace.
3. WHERE the viewer is a Platform_Admin, THE Abuse_Dashboard SHALL list flagged links across every workspace.
4. THE Abuse_Dashboard SHALL allow each row to be actioned with `block`, `unblock`, or `request rescan`.
5. IF the audit log helper fails or is unavailable when an Abuse_Dashboard action is attempted, THEN THE Abuse_Dashboard SHALL abort the action and respond with HTTP 503, leaving the link state unchanged.
6. IF the viewer is neither a Workspace_Admin nor a Platform_Admin, THEN THE Abuse_Dashboard SHALL respond with HTTP 403.

### Requirement 16: Public Trust API

**User Story:** As a developer integrating LinkForge, I want a public API to evaluate any URL, so that I can call our scanner backplane from my own application.

#### Acceptance Criteria

1. THE Trust_API SHALL accept HTTP GET requests at `/api/v1/safety/check` with a query parameter `url` containing a percent-encoded absolute HTTP or HTTPS URL.
2. THE Trust_API SHALL authenticate every request via an `Authorization: Bearer <api_key>` header tied to a workspace.
3. WHERE the calling workspace's Plan does not include Trust_API access, THE Trust_API SHALL respond with HTTP 403 and the body `{"error":"plan_upgrade_required"}`.
4. WHEN the requested URL has a cached Scan_Report whose `safety_scanned_at` is within the cache TTL window, THE Trust_API SHALL return that cached result, SHALL NOT enqueue a new scan, and SHALL NOT submit a background scan to refresh the cache.
5. THE Trust_API cache TTL window SHALL be greater than or equal to 1 hour and less than or equal to 24 hours.
6. WHEN the requested URL has no fresh cached Scan_Report, THE Trust_API SHALL submit a scan, wait at most 30 seconds for completion, and respond with HTTP 202 and a `scanId` if completion does not occur in that window.
7. WHEN a fresh cached Scan_Report exists for the requested URL, THE Trust_API SHALL respond with HTTP 200 and the cached result and SHALL NOT respond with HTTP 202.
7. THE Trust_API SHALL respond with a JSON object containing `url`, `trustScore`, `trustBand`, `verdict`, `categories`, `assetRiskFlags`, `redirectChainLength`, `scannedAt`, and `cacheHit`.
8. THE Trust_API SHALL apply per-API-key rate limiting using the existing `rateLimitByUser` helper, with limits scaled by Plan, and SHALL respond with HTTP 429 when the limit is exceeded.
9. WHEN any Trust_API request returns a 2xx response, THE Trust_API SHALL increment the workspace's `apiCalls` usage counter by 1.
10. IF the `url` query parameter is absent or fails URL validation, THEN THE Trust_API SHALL respond with HTTP 400 and the body `{"error":"invalid_url"}`.

### Requirement 17: Trust API Round-Trip Properties

**User Story:** As a maintainer, I want the URL parsing and serialization paths in the Trust API to be round-trip safe, so that customers receive the URL they sent.

#### Acceptance Criteria

1. FOR ALL valid absolute HTTP or HTTPS URLs accepted by the Trust_API, THE Trust_API SHALL return a `url` field whose canonical form parses back into the same submitted URL after canonicalization (round-trip property).
2. FOR ALL Scan_Report payloads, the JSON serializer used by the Trust_API SHALL produce output that, when parsed, equals the original Scan_Report (round-trip property).
3. WHEN the Trust_API serializes a Scan_Report, THE Trust_API SHALL produce a JSON document that validates against the published Trust_API JSON schema.

### Requirement 18: Plan-Tier Gating

**User Story:** As a product owner, I want safety features gated by Plan, so that pricing aligns with the cost of Cloudflare scans.

#### Acceptance Criteria

1. THE LinkForge effective-limits resolver SHALL expose a `safety` capability object containing booleans for `techStack`, `screenshot`, `redirectChain`, `similaritySearch`, `trustApi`, `scheduledRescan`, `webhookSafetyEvents`, and `visitorPreview`.
2. WHERE the workspace Plan is `free`, THE `safety` capability object SHALL set every capability except a basic verdict to false.
3. WHERE the workspace Plan is `growth` or higher, THE `safety` capability object SHALL set `techStack`, `screenshot`, `redirectChain`, and `visitorPreview` to true.
4. WHERE the workspace Plan is `business` or higher, THE `safety` capability object SHALL additionally set `similaritySearch` and `trustApi` to true.
5. WHEN any feature in this document is invoked for a workspace, THE invoking code SHALL consult the `safety` capability object and SHALL deny the action when the corresponding capability is false.

### Requirement 19: Retention Policy for Scan Artifacts

**User Story:** As a platform operator, I want large scan artifacts deleted on a schedule, so that storage costs stay bounded.

#### Acceptance Criteria

1. THE Retention_Service SHALL run on a cron at least every 24 hours.
2. WHEN the Retention_Service runs, THE Retention_Service SHALL delete every persisted screenshot whose owning Scan_Report is not the latest finished Scan_Report for its link AND whose `fetched_at` is older than 30 days.
3. WHEN the Retention_Service runs, THE Retention_Service SHALL delete every HAR file whose `fetched_at` is older than 14 days, regardless of latest-status.
4. WHEN the Retention_Service runs, THE Retention_Service SHALL retain the latest finished Scan_Report row for every existing link.
5. WHEN the Retention_Service runs, THE Retention_Service SHALL delete Scan_Report rows other than the latest finished Scan_Report when the row's `fetched_at` is older than 180 days.
6. WHERE the workspace Plan is `enterprise`, THE Retention_Service SHALL extend every retention window in this requirement by an additional 180 days.
7. THE Retention_Service SHALL record the count of deleted artifacts and Scan_Report rows per run through the existing audit log helper.

### Requirement 20: Cost Controls for Scanner Calls

**User Story:** As a platform operator, I want a hard ceiling on Cloudflare scan calls, so that runaway scans cannot blow our budget.

#### Acceptance Criteria

1. THE URL_Scanner_Service SHALL track a daily count of submitted scans per workspace in Redis under a key with a 24-hour TTL.
2. WHEN a workspace exceeds its Plan-defined daily scan ceiling, THE URL_Scanner_Service SHALL refuse new scan submissions for that workspace and SHALL respond to the caller with HTTP 429.
3. THE URL_Scanner_Service SHALL track a global daily count of submitted scans across all workspaces.
4. WHEN the global daily count exceeds the configured global ceiling, THE URL_Scanner_Service SHALL refuse new scan submissions from any workspace and SHALL emit a platform alert.
5. THE Rescan_Scheduler SHALL respect the ceilings defined in this requirement and SHALL NOT enqueue scans that would breach the ceilings.

### Requirement 21: Privacy and PII Handling

**User Story:** As a privacy-conscious operator, I want to limit exposure of personally identifiable information collected during scans, so that LinkForge meets regulatory expectations.

#### Acceptance Criteria

1. WHEN a Scan_Report contains visitor IP addresses outside of the page IP and certificate IPs, THE URL_Scanner_Service SHALL store only the registrable domain and ASN, and SHALL NOT persist the raw IP for that contacted resource.
2. THE Trust_API response SHALL NOT include any field that contains a raw third-party IP outside of the page IP.
3. WHERE a workspace operator initiates a Right-To-Be-Forgotten request for a deleted link, THE URL_Scanner_Service SHALL purge every Scan_Report and Scan_Artifact tied to that link within 7 days.
4. THE URL_Scanner_Service SHALL purge Scan_Artifacts tied to a deleted link only in response to a Right-To-Be-Forgotten request initiated by a workspace operator; otherwise THE URL_Scanner_Service SHALL retain Scan_Artifacts subject to the Retention_Service policy.
5. THE Visitor_Preview_Page SHALL NOT store visitor analytics for visitors that send a `Sec-GPC: 1` header beyond the existing aggregated counters.

### Requirement 22: Idempotency of Rescans

**User Story:** As a maintainer, I want repeated rescan calls to behave consistently, so that webhooks and counters do not double-fire.

#### Acceptance Criteria

1. WHEN two rescan requests for the same link are received within 5 seconds of each other, THE URL_Scanner_Service SHALL coalesce them into a single Cloudflare scan submission.
2. IF the coalescing mechanism (e.g., the Redis lock) is unavailable when a rescan request is received, THEN THE URL_Scanner_Service SHALL refuse the rescan request, respond with HTTP 503, and SHALL NOT submit a duplicate Cloudflare scan.
2. WHEN the same Scan_Report id is processed twice by the URL_Scanner_Service, THE URL_Scanner_Service SHALL produce the same persisted state on the second processing as after the first (idempotency property).
3. WHEN the Trust_Score_Engine is invoked twice on the same Scan_Report and the same weight-table version, THE Trust_Score_Engine SHALL produce the same Trust_Score and Trust_Band on every invocation (idempotency property).
4. WHEN the Asset_Risk_Analyzer is invoked twice on the same Scan_Report, THE Asset_Risk_Analyzer SHALL persist the same set of AssetRiskFlag records after both invocations (idempotency property).

### Requirement 23: Trust Score Invariants

**User Story:** As a maintainer, I want the Trust Score formula to obey strict invariants, so that property tests can verify correctness.

#### Acceptance Criteria

1. FOR ALL Scan_Reports, THE Trust_Score_Engine SHALL produce a Trust_Score that is greater than or equal to 0 and less than or equal to 100.
2. FOR ALL pairs of Scan_Reports A and B where A and B are identical except B has `verdicts.overall.malicious` true and A has it false, THE Trust_Score_Engine SHALL produce `score(B) <= score(A)` (monotonicity property).
3. FOR ALL pairs of Scan_Reports A and B where A and B are identical except B has a longer Redirect_Chain than A, THE Trust_Score_Engine SHALL produce `score(B) <= score(A)` (monotonicity property).
4. FOR ALL pairs of Scan_Reports A and B where A and B are identical except B has more AssetRiskFlag records than A, THE Trust_Score_Engine SHALL produce `score(B) <= score(A)` (monotonicity property).
5. FOR ALL Scan_Reports, the mapping from Trust_Score to Trust_Band SHALL be deterministic such that the same Trust_Score always maps to the same Trust_Band (function property).

### Requirement 24: Cache TTL Bounds

**User Story:** As a maintainer, I want every cache TTL in the feature bounded, so that staleness and cost stay within agreed limits.

#### Acceptance Criteria

1. THE similarity-search result cache TTL SHALL be greater than or equal to 24 hours and less than or equal to 72 hours.
2. THE Trust_API URL cache TTL SHALL be greater than or equal to 1 hour and less than or equal to 24 hours.
3. THE screenshot signed-URL TTL SHALL be greater than or equal to 5 minutes and less than or equal to 15 minutes.
4. FOR ALL cache entries written by this feature, THE writing component SHALL set an explicit TTL.
5. IF any cache entry is found without a TTL, THEN THE Retention_Service SHALL delete that entry on its next run.

### Requirement 25: Auditability and Observability

**User Story:** As an operator, I want every safety state change traceable, so that I can investigate incidents.

#### Acceptance Criteria

1. WHEN a link's Trust_Band changes between Scan_Reports, THE URL_Scanner_Service SHALL record an audit log entry containing link id, previous Trust_Band, new Trust_Band, scan id, and timestamp.
2. WHEN a Workspace_Admin or Platform_Admin actions a row in the Abuse_Dashboard, THE Abuse_Dashboard SHALL record an audit log entry containing actor id, action, link id, and timestamp.
3. THE URL_Scanner_Service SHALL emit a PostHog event named `safety_scan_completed` for every finished Scan_Report containing `workspaceId`, `linkId`, `trustScore`, `trustBand`, and `cacheHit`.
4. THE Trust_API SHALL emit a PostHog event named `trust_api_call` for every request containing `workspaceId`, `apiKeyId`, `cacheHit`, and `responseStatus`.

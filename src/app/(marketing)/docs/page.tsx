"use client";

import { useState } from "react";
import Link from "next/link";

const BASE_URL = "https://pivoturl.vercel.app";

const sections = [
  { id: "whats-new", label: "What's New" },
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "links", label: "Links API" },
  { id: "analytics", label: "Analytics API" },
  { id: "smart-insights", label: "Smart Insights" },
  { id: "qr", label: "QR Code API" },
  { id: "workspace", label: "Workspace API" },
  { id: "keys", label: "API Keys" },
  { id: "sdk", label: "SDK & Clients" },
  { id: "webhooks", label: "Webhooks" },
  { id: "errors", label: "Error Handling" },
  { id: "rate-limits", label: "Rate Limits" },
];

function Code({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-50 font-mono leading-relaxed">
      {children}
    </pre>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="absolute right-2 top-2 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang = "ts" }: { code: string; lang?: string }) {
  return (
    <div className="relative my-4">
      <CopyButton text={code} />
      <Pre>{code}</Pre>
    </div>
  );
}

function EndpointBadge({ method }: { method: "GET" | "POST" | "PATCH" | "DELETE" }) {
  const colors: Record<string, string> = {
    GET: "bg-green-50 text-green-700 border-green-200",
    POST: "bg-blue-50 text-blue-700 border-blue-200",
    PATCH: "bg-amber-50 text-amber-700 border-amber-200",
    DELETE: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-block shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${colors[method]}`}>
      {method}
    </span>
  );
}

function Endpoint({ method, path, description }: { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 my-3">
      <EndpointBadge method={method} />
      <div className="min-w-0">
        <code className="text-sm font-mono font-semibold text-slate-900 break-all">{path}</code>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      {children}
    </section>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; default: string; description: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Param</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Type</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Default</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {params.map((p) => (
            <tr key={p.name}>
              <td className="px-4 py-2 font-mono text-xs text-slate-800">{p.name}</td>
              <td className="px-4 py-2 text-slate-600">{p.type}</td>
              <td className="px-4 py-2 text-slate-600">{p.default}</td>
              <td className="px-4 py-2 text-slate-500">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
            PivotUrl<span className="text-slate-600">.</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <span className="text-slate-900 font-medium">Docs</span>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl px-6">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto py-10 lg:block">
          <nav className="space-y-1 border-l border-slate-200 pl-4">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 py-10 md:py-16 lg:pl-12">
          <div className="max-w-3xl">
            {/* Title */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                API Documentation
              </h1>
              <p className="text-lg text-slate-500">
                Integrate link shortening, click analytics, and QR code generation into your applications using the PivotUrl REST API and first-party SDKs.
              </p>
            </div>

            {/* ─── What's New ──────────────────────────────── */}
            <Section id="whats-new">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">What's New</h2>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 mb-6">
                Latest updates from the <strong>May 2026</strong> release.
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">Analytics &amp; Smart Insights</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                A brand-new insights engine that gives you actionable recommendations based on your link performance data. The analytics dashboard now includes AI-powered insights, audience demographics, and posting-time heatmaps to help you optimize your link strategy.
              </p>

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Smart Insights</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>AI-powered recommendations</strong> — the engine detects growth trends, top performers, device share changes, peak engagement hours, and country concentration; returns up to 5 actionable insight cards (opportunity, trend, warning, recommendation)</li>
                <li><strong>Insight cards</strong> — color-coded cards with title, description, metric value, and contextual icon for quick scanning</li>
                <li><strong>Dedicated insights page</strong> — new route under <Code>/dashboard/analytics/insights</Code> with date range filtering and side-by-side audience + posting-time views</li>
              </ul>
              <Endpoint method="GET" path="/api/v1/analytics/insights" description="Returns AI-generated insights comparing current vs prior period: growth, top links, device share, peak hour, country concentration." />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Audience Profile</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Demographics breakdown</strong> — top device, browser, OS, country, and referrer displayed as labeled progress bars with percentage share</li>
                <li><strong>Platform split</strong> — visual segmented bar showing Mobile / Desktop / Other distribution</li>
                <li><strong>Natural-language summary</strong> — auto-generated sentence describing the audience composition</li>
              </ul>
              <Endpoint method="GET" path="/api/v1/analytics/audience" description="Returns audience profile: top devices, browsers, OS, countries, referrers, and platform split percentages." />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Posting Times</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Hourly heatmap</strong> — 24-column compact grid showing click distribution across hours</li>
                <li><strong>Peak hour detection</strong> — highlights the best posting time with a ring indicator and time-of-day icon (morning, afternoon, evening, night)</li>
                <li><strong>Smart recommendation</strong> — suggests optimal time-of-day part for posting new links</li>
              </ul>
              <Endpoint method="GET" path="/api/v1/analytics/posting-times" description="Returns 24-hour click distribution, peak hour, runner-up, dead zones, and posting recommendation." />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Deep Linking</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Links can now open native mobile apps instead of the browser. Support for iOS Universal Links and Android App Links with automatic app association file serving.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Universal Links (iOS)</strong> — enable per-link with an iOS bundle ID; Apple App Site Association file served automatically at <Code>/.well-known/apple-app-site-association</Code></li>
                <li><strong>App Links (Android)</strong> — enable per-link with Android package name; Digital Asset Links file served at <Code>/.well-known/assetlinks.json</Code></li>
                <li><strong>Auto-generated association files</strong> — both endpoints query the database for links with deep linking enabled, deduplicate identifiers, and serve valid JSON on every request</li>
                <li><strong>URI scheme fallback</strong> — configurable custom URI scheme per link for apps that register their own protocol handler</li>
                <li><strong>App store redirect</strong> — when the app is not installed, links can redirect to the App Store or Google Play store page</li>
                <li><strong>Internal association API</strong> — authenticated endpoint at <Code>/api/internal/app-association</Code> for workers and provisioning systems to fetch associations for a specific domain</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Domains Management</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                You can now connect your own domain to brand your short links. The domains management page has been fully redesigned with an inline table view, expandable detail panels, and real-time DNS verification status backed by the Cloudflare Custom Hostnames API.
              </p>

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">UI Redesign</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Table view</strong> — domains listed with status badges (Verified / Pending / Error) and relative creation time</li>
                <li><strong>Expandable rows</strong> — click any domain to see full metadata, CNAME and TLS status, and DNS record details</li>
                <li><strong>Inline add form</strong> — add a domain directly in the page without modals or slide-overs</li>
                <li><strong>DNS setup instructions</strong> — copy-ready CNAME and TXT record values with one-click copy buttons</li>
                <li><strong>Verify Now</strong> — checks DNS TXT ownership and Cloudflare hostname + SSL status in one call</li>
                <li><strong>Re-validate SSL</strong> — triggers a new Cloudflare SSL certificate issuance when validation times out</li>
                <li><strong>Three-dot menu</strong> — per-row actions for setup instructions, set as primary, and delete</li>
                <li><strong>Status banner</strong> — contextual banner at the top for important domain-related announcements</li>
              </ul>

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">API Endpoints</h4>
              <Endpoint method="POST" path="/api/domains/:id/verify" description="Check DNS TXT record and Cloudflare hostname + SSL status. Returns severity (success/warning/error) and canRevalidate flag for stuck/timed-out domains." />
              <Endpoint method="POST" path="/api/domains/:id/revalidate" description="Re-trigger Cloudflare SSL certificate validation. Calls revalidate() then syncs the updated status from Cloudflare back to the database." />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Cloudflare Custom Hostnames Integration</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Automatic provisioning</strong> — when a domain is added, a Cloudflare Custom Hostname is created with http-01 SSL validation</li>
                <li><strong>Status sync</strong> — hostname status (active/pending/blocked) and SSL status (active/pending_validation/validation_timed_out) are stored in the database and updated on each verify check</li>
                <li><strong>Revalidation</strong> — PATCH endpoint calls Cloudflare's revalidate API, then fetches the updated state immediately and persists it</li>
                <li><strong>Graceful degradation</strong> — domain creation and management work even when Cloudflare credentials are not configured; errors are persisted and displayed in the UI</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Billing &amp; Webhooks</h3>

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Dodo Payments Webhook Fixes</h4>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Fixed several data persistence bugs in the billing webhook pipeline that caused incorrect plan mapping and billing cycle values.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>billingCycle normalization</strong> — Dodo sends capitalized Month/Year; now correctly mapped to monthly/annual</li>
                <li><strong>Plan resolution</strong> — removed broken planFromConfiguredPrices() that compared product_id against price IDs (always no match); now uses mapProductToPlan() + guessPlanFromName()</li>
                <li><strong>Amount precision</strong> — fixed double-division bug where /100 was applied in both the webhook and the billing page</li>
                <li><strong>Enterprise plan</strong> — corrected enterprise product ID mapping so enterprise customers get the enterprise plan instead of business</li>
                <li><strong>Enterprise plan added to PLANS</strong> — added full enterprise plan definition with <Code>planMap.ts</Code> and <Code>plans.ts</Code>, fixing the Vercel build type error where <Code>"enterprise"</Code> was missing from <Code>PlanKey</Code></li>
                <li><strong>Free plan domains</strong> — removed custom domain limit on the Free plan (unlimited domains)</li>
              </ul>

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Webhook Event Types Overhaul</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Comprehensive event taxonomy</strong> — overhauled webhook event types with clear prefixes and granular event names across billing, link, and workspace domains</li>
                <li><strong>Event filtering</strong> — subscribers can now opt into specific event types rather than receiving all events</li>
                <li><strong>Consistent payload shape</strong> — standardized event payloads with version field and uniform metadata envelope</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">UI / UX</h3>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Light mode</strong> — domains page converted to white backgrounds with black accent buttons and gray borders/text; no slate/indigo/dark palettes remaining on that page</li>
                <li><strong>Sidebar cleanup</strong> — COMING SOON badges removed from Link in Bio and Domains nav items; both pages are live</li>
                <li><strong>Nested button fix</strong> — resolved hydration error by converting table row from button to div with role="button" and keyboard handler</li>
                <li><strong>Dropdown clipping fix</strong> — removed overflow-hidden from table container so dropdown menus render unclipped outside table bounds</li>
              </ul>
            </Section>

            {/* ─── Overview ─────────────────────────────────── */}
            <Section id="overview">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Overview</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                PivotUrl exposes a REST API at <Code>{`${BASE_URL}/api/v2`}</Code>. All requests must be authenticated with a Bearer token. The API supports two key types: <strong>secret keys</strong> (<Code>lf_sk_...</Code>) for full CRUD access, and <strong>publishable keys</strong> (<Code>lf_pk_...</Code>) for read-only operations safe to use in browser environments.
              </p>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Responses are JSON. Errors use a consistent <Code>{`{ error: { code, message } }`}</Code> shape. Rate limit information is returned in response headers on every request.
              </p>
            </Section>

            {/* ─── Authentication ─────────────────────────── */}
            <Section id="authentication">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Send your API key in the <Code>Authorization</Code> header:
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">curl</h3>
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_your-api-key" \\
  "${BASE_URL}/api/v2/links?limit=5"`} lang="bash" />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">JavaScript / TypeScript</h3>
              <CodeBlock code={`const res = await fetch("${BASE_URL}/api/v2/links?limit=5", {
  headers: { Authorization: "Bearer lf_sk_your-api-key" },
});
const json = await res.json();`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Python</h3>
              <CodeBlock code={`import requests

res = requests.get(
    "${BASE_URL}/api/v2/links",
    headers={"Authorization": "Bearer lf_sk_your-api-key"},
    params={"limit": 5}
)
data = res.json()`} lang="python" />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Go</h3>
              <CodeBlock code={`package main

import (
    "fmt"
    "net/http"
    "io"
)

func main() {
    req, _ := http.NewRequest("GET", "${BASE_URL}/api/v2/links?limit=5", nil)
    req.Header.Set("Authorization", "Bearer lf_sk_your-api-key")
    
    client := &http.Client{}
    resp, _ := client.Do(req)
    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`} lang="go" />

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Security note:</strong> Secret keys (<Code>lf_sk_</Code>) grant full access to your workspace. Never expose them in client-side code or version control. Use publishable keys (<Code>lf_pk_</Code>) for browser environments.
              </div>
            </Section>

            {/* ─── Links API ──────────────────────────────── */}
            <Section id="links">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Links API</h2>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">List Links</h3>
              <Endpoint method="GET" path="/api/v2/links" description="Get paginated, searchable, sortable list of links for the authenticated workspace." />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Query Parameters</h4>
              <ParamTable params={[
                { name: "offset", type: "integer", default: "0", description: "Number of results to skip" },
                { name: "limit", type: "integer", default: "50", description: "Max results per page (max 100)" },
                { name: "search", type: "string", default: "—", description: "Filter by slug, title, or destination URL" },
                { name: "sortBy", type: "string", default: "createdAt", description: "Field to sort by: createdAt, slug, totalClicks" },
                { name: "sortOrder", type: "string", default: "desc", description: "asc or desc" },
              ]} />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Response</h4>
              <CodeBlock code={`{
  "data": [
    {
      "id": "uuid",
      "slug": "my-slug",
      "destination": "https://example.com",
      "title": "My Link",
      "description": "Campaign page",
      "tags": ["marketing"],
      "totalClicks": 42,
      "uniqueClicks": 35,
      "isActive": true,
      "utmSource": null,
      "utmMedium": null,
      "utmCampaign": null,
      "password": null,
      "expiresAt": null,
      "clickLimit": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 100, "offset": 0, "limit": 50 }
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Create a Link</h3>
              <Endpoint method="POST" path="/api/v2/links" description="Create a new short link (secret key required)." />
              <p className="text-slate-500 text-sm mb-3">Body (JSON):</p>
              <CodeBlock code={`// Required
"destination": "https://example.com/long-url",

// Optional — slug auto-generated if omitted
"slug": "custom-slug",

// Metadata
"title": "My Link",
"description": "Campaign landing page",
"tags": ["marketing", "launch"],

// Security
"password": "secret123",
"expiresAt": "2026-12-31T23:59:59Z",
"clickLimit": 1000,

// UTM tracking
"utmSource": "newsletter",
"utmMedium": "email",
"utmCampaign": "spring-launch",
"utmTerm": "keywords",
"utmContent": "hero-banner",

// Social preview (OG tags)
"ogTitle": "Open Graph Title",
"ogDescription": "OG description",
"ogImage": "https://example.com/og.png",

// Deep linking
"iosDestination": "https://apps.apple.com/...",
"androidDestination": "https://play.google.com/...",

// A/B testing
"abTestEnabled": false`} />

              <h4 className="text-sm font-semibold text-slate-500 mb-2">Example — create a link with password + UTM</h4>
              <CodeBlock code={`curl -X POST "${BASE_URL}/api/v2/links" \\
  -H "Authorization: Bearer lf_sk_your-secret-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "https://example.com/black-friday",
    "slug": "bf-2026",
    "title": "Black Friday 2026",
    "password": "secret123",
    "utmSource": "email",
    "utmMedium": "newsletter",
    "utmCampaign": "black-friday-2026"
  }'`} lang="bash" />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Get a Link</h3>
              <Endpoint method="GET" path="/api/v2/links/:id" description="Get a single link by ID." />
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  "${BASE_URL}/api/v2/links/link-id"`} lang="bash" />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Update a Link</h3>
              <Endpoint method="PATCH" path="/api/v2/links/:id" description="Update link fields (secret key required)." />
              <p className="text-slate-500 text-sm mb-3">Send only the fields you want to update:</p>
              <CodeBlock code={`curl -X PATCH "${BASE_URL}/api/v2/links/link-id" \\
  -H "Authorization: Bearer lf_sk_your-secret-key" \\
  -H "Content-Type: application/json" \\
  -d '{ "title": "Updated Title", "isActive": true }'`} lang="bash" />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Delete a Link</h3>
              <Endpoint method="DELETE" path="/api/v2/links/:id" description="Deactivate a link (secret key required)." />
              <p className="text-slate-500 text-sm">Links are soft-deleted — <Code>isActive</Code> is set to <Code>false</Code>.</p>
              <CodeBlock code={`curl -X DELETE "${BASE_URL}/api/v2/links/link-id" \\
  -H "Authorization: Bearer lf_sk_your-secret-key"`} lang="bash" />
            </Section>

            {/* ─── Analytics API ──────────────────────────── */}
            <Section id="analytics">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Analytics API</h2>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Overview</h3>
              <Endpoint method="GET" path="/api/v2/analytics/overview" description="Get aggregate analytics for the workspace or a single link." />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Query Parameters</h4>
              <ParamTable params={[
                { name: "range", type: "string", default: "30d", description: "7d, 30d, 90d, or custom" },
                { name: "from", type: "ISO date", default: "—", description: "Start date (required if range=custom)" },
                { name: "to", type: "ISO date", default: "—", description: "End date (required if range=custom)" },
                { name: "linkId", type: "uuid", default: "—", description: "Filter to a single link" },
              ]} />
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  "${BASE_URL}/api/v2/analytics/overview?range=30d"`} lang="bash" />
              <CodeBlock code={`{
  "data": {
    "totalClicks": 15230,
    "uniqueClicks": 8921,
    "clicksToday": 234,
    "clicksGrowth": 12.5,
    "topLink": { "id": "uuid", "slug": "my-link", "clicks": 3400 },
    "topCountry": "United States",
    "topDevice": "mobile"
  }
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Breakdown</h3>
              <Endpoint method="GET" path="/api/v2/analytics/breakdown" description="Get click breakdown by dimension (country, device, browser, OS, referrer)." />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Query Parameters</h4>
              <ParamTable params={[
                { name: "dimension", type: "string", default: "country", description: "country, device, browser, os, or referrer" },
                { name: "range", type: "string", default: "7d", description: "7d, 30d, 90d, or custom" },
                { name: "linkId", type: "uuid", default: "—", description: "Filter to a single link" },
              ]} />
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  "${BASE_URL}/api/v2/analytics/breakdown?dimension=country&range=7d"`} lang="bash" />
              <CodeBlock code={`{
  "data": [
    { "label": "United States", "clicks": 5400, "percentage": 35.4 },
    { "label": "India", "clicks": 3200, "percentage": 21.0 },
    { "label": "United Kingdom", "clicks": 2100, "percentage": 13.8 }
  ]
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Timeseries</h3>
              <Endpoint method="GET" path="/api/v2/analytics/timeseries" description="Get click volume over time (daily or hourly)." />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Query Parameters</h4>
              <ParamTable params={[
                { name: "groupBy", type: "string", default: "day", description: "day or hour" },
                { name: "range", type: "string", default: "7d", description: "7d, 30d, 90d, or custom" },
                { name: "linkId", type: "uuid", default: "—", description: "Filter to a single link" },
              ]} />
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  "${BASE_URL}/api/v2/analytics/timeseries?groupBy=day&range=30d"`} lang="bash" />
              <CodeBlock code={`{
  "data": [
    { "date": "2026-05-01", "clicks": 450, "uniqueClicks": 320 },
    { "date": "2026-05-02", "clicks": 520, "uniqueClicks": 380 }
  ]
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Top Links</h3>
              <Endpoint method="GET" path="/api/v2/analytics/top-links" description="Get top-performing links with 7-day trend data." />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Query Parameters</h4>
              <ParamTable params={[
                { name: "range", type: "string", default: "7d", description: "7d, 30d, 90d, or custom" },
                { name: "limit", type: "integer", default: "10", description: "Max results" },
              ]} />
              <CodeBlock code={`{
  "data": [
    {
      "id": "uuid",
      "title": "My Link",
      "slug": "my-link",
      "url": "https://example.com",
      "clicks": 3400,
      "uniqueClicks": 2100,
      "ctr": 68.3,
      "trend": [120, 150, 98, 200, 175, 160, 210]
    }
  ]
}`} />
            </Section>

            {/* ─── Smart Insights ─────────────────────────── */}
            <Section id="smart-insights">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Smart Insights</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Smart Insights is an AI-powered analytics layer that goes beyond raw click numbers. It surfaces actionable recommendations, audience profiles, and optimal posting times — automatically generated from your click data.
              </p>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Available in the dashboard sidebar under <strong>Insights</strong>, and from the Analytics page hero card.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Best Posting Times</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Posting Times analyzes the 24-hour click distribution across all your links to identify when your audience is most active. It extracts the hour of day from every click timestamp and groups them into one-hour buckets.
              </p>
              <h4 className="text-sm font-semibold text-slate-500 mb-2">What you get</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li>24-hour heatmap showing click volume per hour</li>
                <li>Peak hour identification (your highest-traffic window)</li>
                <li>Runner-up and dead zone detection</li>
                <li>Natural language recommendation (e.g., "Your audience peaks at 8 PM — schedule links to go live in the evening")</li>
              </ul>
              <CodeBlock code={`GET /api/v1/analytics/posting-times?workspaceId=ws_xxx&range=30d

{
  "buckets": [
    { "hour": 0,  "label": "12 AM", "clicks": 42,  "percentage": 1.2 },
    { "hour": 8,  "label": "8 AM",  "clicks": 145, "percentage": 4.1 },
    { "hour": 20, "label": "8 PM",  "clicks": 680, "percentage": 19.2 },
    ...
  ],
  "peak":      { "hour": 20, "label": "8 PM",  "clicks": 680 },
  "runnerUp":  { "hour": 9,  "label": "9 AM",  "clicks": 520 },
  "deadZone":  { "hour": 3,  "label": "3 AM",  "clicks": 8 },
  "recommendation": "Your audience is most active during Evening, with peak engagement at 8 PM. Evening accounts for 42% of all clicks..."
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Audience Intelligence</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Audience Intelligence builds a real-time profile of who your visitors are — what devices they use, which browsers, operating systems, countries, and referrers drive your traffic. It surfaces the top value for each dimension with percentage share.
              </p>
              <h4 className="text-sm font-semibold text-slate-500 mb-2">What you get</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li>Top device type (mobile / desktop / tablet) with percentage</li>
                <li>Top browser and OS</li>
                <li>Top country and referrer source</li>
                <li>Mobile vs desktop platform split (visual bar + percentages)</li>
                <li>Summarized audience profile sentence</li>
              </ul>
              <CodeBlock code={`GET /api/v1/analytics/audience?workspaceId=ws_xxx&range=30d

{
  "topDevice":   { "label": "mobile",  "percentage": 68 },
  "topBrowser":  { "label": "Chrome",  "percentage": 52 },
  "topOs":       { "label": "iOS",     "percentage": 34 },
  "topCountry":  { "label": "United States", "percentage": 41 },
  "topReferrer": { "label": "twitter.com",    "percentage": 28 },
  "mobileShare": 68,
  "desktopShare": 29,
  "platformSplit": [
    { "platform": "Mobile",  "percentage": 68 },
    { "platform": "Desktop", "percentage": 29 },
    { "platform": "Other",   "percentage": 3 }
  ],
  "summary": "Your audience is primarily Mobile (68% mobile, 29% desktop), using Chrome on iOS. Most traffic comes from United States, driven largely by twitter.com."
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Actionable Insights</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                The Insights engine automatically scans your workspace data across multiple dimensions and generates contextual, color-coded cards. Each card has a type — <strong>opportunity</strong>, <strong>trend</strong>, <strong>warning</strong>, or <strong>recommendation</strong> — with a human-readable title, description, and metric badge.
              </p>
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Insight triggers</h4>
              <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-600 mb-4">
                <li><strong>Growth trend</strong> — detects traffic surges (&gt;20% up) or drops (&gt;20% down) vs previous period</li>
                <li><strong>Star performer</strong> — flags links that drive more than double the clicks of the second-best link</li>
                <li><strong>Mobile-first alert</strong> — recommends mobile optimization when mobile share exceeds 80%</li>
                <li><strong>Best posting time</strong> — shows your peak hour with engagement advice</li>
                <li><strong>Country concentration</strong> — alerts when a single country drives more than 50% of traffic</li>
              </ul>
              <CodeBlock code={`GET /api/v1/analytics/insights?workspaceId=ws_xxx&range=30d

{
  "insights": [
    {
      "type": "opportunity",
      "title": "Best Posting Time",
      "description": "Your audience peaks at 8 PM (680 clicks). Schedule your most important links to go live during evening for maximum engagement.",
      "metric": "8 PM",
      "icon": "clock"
    },
    {
      "type": "trend",
      "title": "Traffic Surge",
      "description": "Your click volume is up 34% compared to the previous period. This is a significant growth spike.",
      "metric": "+34%",
      "icon": "trending-up"
    },
    {
      "type": "recommendation",
      "title": "Mobile-First Audience",
      "description": "68% of your traffic is on mobile. Ensure your landing pages load quickly and are fully responsive.",
      "metric": "68% mobile",
      "icon": "smartphone"
    }
  ]
}`} />
            </Section>

            {/* ─── QR Code API ────────────────────────────── */}
            <Section id="qr">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">QR Code API</h2>
              <Endpoint method="GET" path="/api/v2/qr" description="Generate a QR code PNG for any URL." />
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Query Parameters</h4>
              <ParamTable params={[
                { name: "url", type: "string", default: "—", description: "The URL to encode (required)" },
                { name: "size", type: "integer", default: "512", description: "Image size in px (64–2048)" },
                { name: "fgColor", type: "hex", default: "#000000", description: "Foreground colour" },
                { name: "bgColor", type: "hex", default: "#ffffff", description: "Background colour, or transparent" },
                { name: "errorLevel", type: "string", default: "M", description: "L, M, Q, or H (error correction)" },
              ]} />
              <p className="text-slate-500 text-sm mb-3">Returns a PNG image (<Code>image/png</Code>). The response is raw binary, not JSON.</p>
              <CodeBlock code={`# Download as file
curl -H "Authorization: Bearer lf_sk_..." \\
  "${BASE_URL}/api/v2/qr?url=https://example.com&size=512" \\
  --output qr.png`} lang="bash" />

              <CodeBlock code={`// JavaScript — display in browser
const res = await fetch("${BASE_URL}/api/v2/qr?url=https://example.com&size=256", {
  headers: { Authorization: "Bearer lf_sk_..." },
});
const blob = await res.blob();
const imgUrl = URL.createObjectURL(blob);
document.querySelector("#qr").src = imgUrl;`} />
            </Section>

            {/* ─── Workspace API ──────────────────────────── */}
            <Section id="workspace">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Workspace API</h2>
              <Endpoint method="GET" path="/api/v2/workspace" description="Get current workspace details (name, slug, plan, limits)." />
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  "${BASE_URL}/api/v2/workspace"`} lang="bash" />
              <CodeBlock code={`{
  "data": {
    "id": "uuid",
    "name": "My Workspace",
    "slug": "my-workspace",
    "plan": "starter",
    "isDefault": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}`} />
              <Endpoint method="PATCH" path="/api/v2/workspace" description="Update workspace name (secret key required)." />
              <CodeBlock code={`curl -X PATCH "${BASE_URL}/api/v2/workspace" \\
  -H "Authorization: Bearer lf_sk_your-secret-key" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "New Workspace Name" }'`} lang="bash" />
            </Section>

            {/* ─── API Keys ───────────────────────────────── */}
            <Section id="keys">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">API Keys</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Manage API keys programmatically. These endpoints are authenticated via your Clerk dashboard session, not by API key.
              </p>
              <Endpoint method="GET" path="/api/v2/keys" description="List all API keys for the workspace." />
              <Endpoint method="POST" path="/api/v2/keys" description="Create a new API key." />
              <p className="text-slate-500 text-sm mb-3">Body: <Code>{`{ "name": "My Key", "keyType": "secret" }`}</Code>. <Code>keyType</Code> is <Code>secret</Code> (default) or <Code>publishable</Code>.</p>
              <CodeBlock code={`// Response — plaintextKey is shown once only
{
  "data": {
    "name": "My Key",
    "keyPrefix": "lf_sk_a1b2c3d4...",
    "keyType": "secret",
    "plaintextKey": "lf_sk_a1b2c3d4e5f6789012345678901234567890abcdef"
  }
}`} />
              <Endpoint method="DELETE" path="/api/v2/keys/:id" description="Revoke (deactivate) an API key." />
              <p className="text-slate-500 text-sm">Manage your keys in the dashboard: <a href="/dashboard/developers/api-keys" className="text-slate-900 underline">/dashboard/developers/api-keys</a></p>
            </Section>

            {/* ─── SDK & Clients ──────────────────────────── */}
            <Section id="sdk">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">SDK &amp; Client Libraries</h2>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">TypeScript / JavaScript</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                The <Code>pivoturl-sdk</Code> package is a first-party TypeScript client. It uses native <Code>fetch</Code> and works in Node.js 18+, Edge Runtimes, and modern browsers.
              </p>
              <CodeBlock code={`npm install pivoturl-sdk`} lang="bash" />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Setup</h4>
              <CodeBlock code={`import { PivotUrlClient } from "pivoturl-sdk";

const client = new PivotUrlClient({
  apiKey: "lf_sk_your-secret-key",
  // baseUrl: "${BASE_URL}/api/v2",  // optional — auto-detected
});`} />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Links</h4>
              <CodeBlock code={`// List with pagination & search
const { data: links, meta } = await client.links.list({
  offset: 0,
  limit: 20,
  search: "example",
});

// Get by ID
const link = await client.links.get("link-id");

// Create with full options
const newLink = await client.links.create({
  destination: "https://example.com",
  slug: "my-slug",
  title: "My Link",
  tags: ["marketing"],
  password: "secret123",
  expiresAt: "2026-12-31T23:59:59Z",
  utmSource: "newsletter",
  utmCampaign: "spring-launch",
  ogTitle: "OG Title",
  ogImage: "https://example.com/og.png",
});

// Update specific fields
const updated = await client.links.update("link-id", {
  title: "New Title",
  isActive: true,
});

// Soft-delete
await client.links.delete("link-id");`} />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Analytics</h4>
              <CodeBlock code={`// Workspace overview (last 30 days)
const overview = await client.analytics.overview({ range: "30d" });

// Breakdown by country (last 7 days)
const byCountry = await client.analytics.breakdown({
  dimension: "country",
  range: "7d",
});

// Daily timeseries (last 30 days)
const daily = await client.analytics.timeseries({
  groupBy: "day",
  range: "30d",
});

// Per-link analytics
const linkOverview = await client.analytics.overview({
  range: "30d",
  linkId: "your-link-id",
});

// Top links
const topLinks = await client.analytics.topLinks({
  range: "7d",
  limit: 10,
});`} />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">QR Codes</h4>
              <CodeBlock code={`// Get raw PNG bytes (ArrayBuffer)
const buffer = await client.qr.generate({
  url: "https://example.com",
  size: 256,
  fgColor: "#000000",
});

// Get data URL (for <img> tags)
const dataUrl = await client.qr.generateDataURL({
  url: "https://example.com",
  size: 512,
});`} />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Workspace &amp; Keys</h4>
              <CodeBlock code={`// Workspace info
const ws = await client.workspace.get();

// Rename workspace
await client.workspace.patch({ name: "New Name" });

// List API keys
const keys = await client.keys.list();

// Create a new key
const created = await client.keys.create("CI/CD Key", "secret");
console.log("Save this key:", created.plaintextKey);

// Revoke a key
await client.keys.revoke("key-id");`} />

              <h4 className="text-sm font-semibold text-slate-500 mb-2 mt-6">Rate Limits</h4>
              <CodeBlock code={`// Each response includes rate limit headers
const res = await client.links.list();
console.log(res.rateLimit); // { limit, remaining, reset }

// Check key type
client.getKeyType(); // "secret" | "publishable"`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-10">Python</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                The <Code>pivoturl</Code> Python package provides a typed client for the PivotUrl API.
              </p>
              <CodeBlock code={`pip install pivoturl`} lang="bash" />
              <CodeBlock code={`from pivoturl import PivotUrl

client = PivotUrl(api_key="lf_sk_your-secret-key")

# List links
links = client.links.list(limit=10)

# Create a link
link = client.links.create(
    destination="https://example.com",
    slug="my-slug",
    title="My Link",
    tags=["marketing"],
)

# Get analytics overview
overview = client.analytics.overview(range="30d")

# Generate QR code
with open("qr.png", "wb") as f:
    f.write(client.qr.generate("https://example.com"))`} lang="python" />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-10">Go</h3>
              <CodeBlock code={`go get github.com/pivoturl/sdk-go`} lang="bash" />
              <CodeBlock code={`package main

import (
    "context"
    "fmt"
    "github.com/pivoturl/sdk-go"
)

func main() {
    client := PivotUrl.NewClient("lf_sk_your-secret-key")

    // List links
    links, _ := client.Links.List(context.Background(), &PivotUrl.ListParams{Limit: 10})
    for _, l := range links.Data {
        fmt.Printf("%s → %s\\n", l.Slug, l.Destination)
    }

    // Create a link
    newLink, _ := client.Links.Create(context.Background(), &PivotUrl.CreateLinkParams{
        Destination: "https://example.com",
        Slug:        "my-slug",
        Title:       "My Link",
    })

    // Analytics
    overview, _ := client.Analytics.Overview(context.Background(), &PivotUrl.AnalyticsParams{
        Range: "30d",
    })
    fmt.Printf("Total clicks: %d\\n", overview.TotalClicks)
}`} lang="go" />
            </Section>

            {/* ─── Webhooks ───────────────────────────────── */}
            <Section id="webhooks">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Webhooks</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Configure webhook endpoints in your dashboard to receive real-time HTTP POST notifications for link events, clicks, conversions, and more. PivotUrl uses <strong>Svix</strong> for reliable delivery with automatic retries and idempotency.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Envelope</h3>
              <p className="text-slate-600 mb-3 leading-relaxed">
                Every webhook payload follows the same envelope:
              </p>
              <CodeBlock code={`{
  "eventType": "link.clicked",       // The event type — always matches the Svix header
  "workspaceId": "ws_uuid",          // The workspace this event belongs to
  "data": { /* event-specific fields */ },
  "actorId": "user_uuid",            // (optional) Who performed the action
  "timestamp": "2026-05-20T12:00:00.000Z"
}`} />
              <p className="text-slate-600 text-sm mb-4">
                Verify payloads using the <Code>svix-id</Code>, <Code>svix-timestamp</Code>, and <Code>svix-signature</Code> headers.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">All Event Types</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Event Type</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Frequency</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">link.created</td><td className="px-4 py-2 text-slate-600">Low</td><td className="px-4 py-2 text-slate-500">A new short link was created</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">link.updated</td><td className="px-4 py-2 text-slate-600">Low</td><td className="px-4 py-2 text-slate-500">A link was updated — <Code>changes</Code> shows old and new values</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">link.deleted</td><td className="px-4 py-2 text-slate-600">Low</td><td className="px-4 py-2 text-slate-500">A link was permanently deleted</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">link.clicked</td><td className="px-4 py-2 text-slate-600">High</td><td className="px-4 py-2 text-slate-500">A link received a click — full geo, device, and referrer context</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">conversion.tracked</td><td className="px-4 py-2 text-slate-600">Medium</td><td className="px-4 py-2 text-slate-500">A conversion was attributed to a link click — includes attribution model and revenue</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">workspace.member_added</td><td className="px-4 py-2 text-slate-600">Low</td><td className="px-4 py-2 text-slate-500">A new member joined the workspace</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">workspace.member_removed</td><td className="px-4 py-2 text-slate-600">Low</td><td className="px-4 py-2 text-slate-500">A member was removed from the workspace</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">workspace.plan_changed</td><td className="px-4 py-2 text-slate-600">Rare</td><td className="px-4 py-2 text-slate-500">The workspace plan was upgraded or downgraded</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">domain.verified</td><td className="px-4 py-2 text-slate-600">Rare</td><td className="px-4 py-2 text-slate-500">A custom domain passed DNS verification</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">domain.deleted</td><td className="px-4 py-2 text-slate-600">Rare</td><td className="px-4 py-2 text-slate-500">A custom domain was removed</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">qr.scanned</td><td className="px-4 py-2 text-slate-600">Medium</td><td className="px-4 py-2 text-slate-500">A QR code was scanned — fires alongside link.clicked</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">link_gallery.viewed</td><td className="px-4 py-2 text-slate-600">Medium</td><td className="px-4 py-2 text-slate-500">A bio page was viewed by a visitor</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Example — link.clicked</h3>
              <CodeBlock code={`{
  "eventType": "link.clicked",
  "workspaceId": "ws_9a8b7c6d-5e4f-3a2b-1c0d-ef1234567890",
  "data": {
    "linkId": "3f4a1b2c-1234-5678-abcd-ef0123456789",
    "slug": "summer-sale",
    "domain": "go.acmecorp.com",
    "country": "IN",
    "city": "Mumbai",
    "region": "Maharashtra",
    "device": "iPhone",
    "deviceType": "ios",
    "browser": "Safari",
    "browserVersion": "17.4.1",
    "os": "iOS",
    "osVersion": "17.4.1",
    "referrer": "https://twitter.com/",
    "referrerDomain": "twitter.com",
    "referrerType": "social",
    "isBot": false,
    "isQrScan": false
  },
  "timestamp": "2026-05-20T12:00:00.000Z"
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Example — conversion.tracked</h3>
              <CodeBlock code={`{
  "eventType": "conversion.tracked",
  "workspaceId": "ws_9a8b7c6d-5e4f-3a2b-1c0d-ef1234567890",
  "data": {
    "linkId": "3f4a1b2c-1234-5678-abcd-ef0123456789",
    "slug": "summer-sale",
    "conversionId": "conv_7b8c9d0e-1234-5678-abcd-ef0123456789",
    "event": "purchase",
    "value": 149.99,
    "currency": "USD",
    "attributionModel": "last_touch",
    "creditPercentage": 100,
    "creditValue": 149.99,
    "customerEmail": "buyer@example.com"
  },
  "timestamp": "2026-05-20T12:05:00.000Z"
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Best Practices</h3>
              <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 mb-4">
                <li><strong>link.clicked</strong> is the only high-frequency event. Respond with <Code>200 OK</Code> immediately and process asynchronously.</li>
                <li>All events carry <Code>workspaceId</Code>. Use a single endpoint and filter by workspace in your handler.</li>
                <li>Use the <Code>svix-id</Code> header for idempotency — Svix guarantees at-least-once delivery.</li>
              </ul>
              <p className="text-slate-600 text-sm mt-4">
                Manage your webhook endpoints in the dashboard under <Code>Settings &rarr; Webhooks</Code> or via the Svix App Portal.
              </p>
            </Section>

            {/* ─── Errors ─────────────────────────────────── */}
            <Section id="errors">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Error Handling</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                All API errors return a consistent JSON shape:
              </p>
              <CodeBlock code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Must be a valid URL"
  }
}`} />

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">Error Codes</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Code</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Status</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">UNAUTHORIZED</td><td className="px-4 py-2 text-slate-600">401</td><td className="px-4 py-2 text-slate-500">Missing or invalid API key</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">FORBIDDEN</td><td className="px-4 py-2 text-slate-600">403</td><td className="px-4 py-2 text-slate-500">Publishable key used for write operation</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">NOT_FOUND</td><td className="px-4 py-2 text-slate-600">404</td><td className="px-4 py-2 text-slate-500">Resource not found</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">CONFLICT</td><td className="px-4 py-2 text-slate-600">409</td><td className="px-4 py-2 text-slate-500">Slug already taken</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">VALIDATION_ERROR</td><td className="px-4 py-2 text-slate-600">422</td><td className="px-4 py-2 text-slate-500">Invalid request body</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">RATE_LIMITED</td><td className="px-4 py-2 text-slate-600">429</td><td className="px-4 py-2 text-slate-500">Rate limit exceeded — see Retry-After header</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">FEATURE_NOT_AVAILABLE</td><td className="px-4 py-2 text-slate-600">402</td><td className="px-4 py-2 text-slate-500">Plan upgrade required for this feature</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs text-slate-800">INTERNAL_ERROR</td><td className="px-4 py-2 text-slate-600">500</td><td className="px-4 py-2 text-slate-500">Something went wrong on our end</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8">SDK Error Handling</h3>
              <CodeBlock code={`import {
  PivotUrlError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "pivoturl-sdk";

try {
  await client.links.create({ destination: "not-a-url" });
} catch (err) {
  if (err instanceof ValidationError) {
    console.error("Validation failed:", err.message, err.details);
  } else if (err instanceof RateLimitError) {
    console.error(\`Rate limited. Retry after \${err.resetTime}s\`);
  } else if (err instanceof AuthenticationError) {
    console.error("Invalid API key. Check your credentials.");
  } else if (err instanceof PivotUrlError) {
    console.error(\`\${err.code}: \${err.message}\`);
  }
}`} />
            </Section>

            {/* ─── Rate Limits ───────────────────────────── */}
            <Section id="rate-limits">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Rate Limits</h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Rate limits are applied per workspace per hour based on your plan. Every response includes rate limit headers so you can monitor your usage programmatically.
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Plan</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Requests / Hour</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Response Headers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2 text-slate-600">Free</td>
                      <td className="px-4 py-2 font-mono text-slate-800">100</td>
                      <td className="px-4 py-2 text-slate-500 text-xs" rowSpan={5}>
                        <Code>X-RateLimit-Limit</Code><br />
                        <Code>X-RateLimit-Remaining</Code><br />
                        <Code>X-RateLimit-Reset</Code><br />
                        <Code>Retry-After</Code>
                      </td>
                    </tr>
                    <tr><td className="px-4 py-2 text-slate-600">Starter</td><td className="px-4 py-2 font-mono text-slate-800">1,000</td></tr>
                    <tr><td className="px-4 py-2 text-slate-600">Growth</td><td className="px-4 py-2 font-mono text-slate-800">5,000</td></tr>
                    <tr><td className="px-4 py-2 text-slate-600">Agency</td><td className="px-4 py-2 font-mono text-slate-800">20,000</td></tr>
                    <tr><td className="px-4 py-2 text-slate-600">Business</td><td className="px-4 py-2 font-mono text-slate-800">50,000</td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`// Read rate limit headers in JavaScript
const res = await fetch("${BASE_URL}/api/v2/links?limit=1", {
  headers: { Authorization: "Bearer lf_sk_..." },
});
const remaining = res.headers.get("X-RateLimit-Remaining");
const resetAt = res.headers.get("X-RateLimit-Reset");
console.log(\`\${remaining} requests remaining, resets at \${resetAt}\`);`} />
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Tip:</strong> When <Code>X-RateLimit-Remaining</Code> approaches 0, back off and retry after the timestamp in <Code>X-RateLimit-Reset</Code>. Rate limits reset on a rolling hourly window.
              </div>
            </Section>

            {/* Footer */}
            <div className="mt-20 border-t border-slate-200 pt-8 text-sm text-slate-500">
              <p>Need help? <a href="mailto:support@pivoturl.com" className="text-slate-900 underline">support@pivoturl.com</a></p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

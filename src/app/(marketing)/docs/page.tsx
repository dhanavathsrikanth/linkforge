"use client";

import { useState } from "react";
import Link from "next/link";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "links", label: "Links API" },
  { id: "analytics", label: "Analytics API" },
  { id: "qr", label: "QR Code API" },
  { id: "workspace", label: "Workspace API" },
  { id: "keys", label: "API Keys" },
  { id: "sdk", label: "TypeScript SDK" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate Limits" },
];

function Code({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-[var(--ds-neutral-100)] px-1.5 py-0.5 text-sm font-mono text-[var(--ds-primary)]">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-neutral-950)] p-4 text-sm text-[var(--ds-neutral-50)] font-mono leading-relaxed">
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
      className="absolute right-2 top-2 rounded-md bg-[var(--ds-neutral-800)] px-2 py-1 text-xs text-[var(--ds-neutral-400)] hover:text-white transition-colors"
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
    GET: "bg-green-100 text-green-800 border-green-200",
    POST: "bg-blue-100 text-blue-800 border-blue-200",
    PATCH: "bg-amber-100 text-amber-800 border-amber-200",
    DELETE: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${colors[method]}`}>
      {method}
    </span>
  );
}

function Endpoint({ method, path, description }: { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-neutral-50)] p-4 my-3">
      <EndpointBadge method={method} />
      <div>
        <code className="text-sm font-mono font-semibold text-[var(--ds-text-primary)]">{path}</code>
        <p className="mt-0.5 text-sm text-[var(--ds-text-secondary)]">{description}</p>
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

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            LinkForge<span className="text-[var(--ds-primary)]">.</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <span className="text-foreground font-medium">Docs</span>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl px-6">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto py-10 lg:block">
          <nav className="space-y-1 border-l border-border pl-4">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--ds-neutral-50)] transition-colors"
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
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Developer Docs
              </h1>
              <p className="text-lg text-muted-foreground">
                Build with LinkForge — short links, analytics, QR codes, and more.
              </p>
            </div>

            {/* ─── Overview ─────────────────────────────────── */}
            <Section id="overview">
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                LinkForge provides a REST API (v2) and a first-party TypeScript SDK for integrating link management, analytics, and QR code generation into your applications.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                The API base URL is <Code>https://api.linkforge.app</Code>. All requests must be authenticated with a Bearer token.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Two types of API keys are supported: <strong>secret keys</strong> (<Code>lf_sk_...</Code>) for full CRUD access, and <strong>publishable keys</strong> (<Code>lf_pk_...</Code>) for read-only operations.
              </p>
            </Section>

            {/* ─── Authentication ─────────────────────────── */}
            <Section id="authentication">
              <h2 className="text-2xl font-bold mb-4">Authentication</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Send your API key in the <Code>Authorization</Code> header as a Bearer token:
              </p>
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_your-api-key" \\
  https://api.linkforge.app/v2/links`} lang="bash" />
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Security note:</strong> Secret keys (<Code>lf_sk_</Code>) grant full access to your workspace. Never expose them in client-side code or version control. Use publishable keys (<Code>lf_pk_</Code>) for browser environments.
              </div>
            </Section>

            {/* ─── Links API ──────────────────────────────── */}
            <Section id="links">
              <h2 className="text-2xl font-bold mb-4">Links API</h2>

              <h3 className="text-lg font-semibold mb-3 mt-8">List Links</h3>
              <Endpoint method="GET" path="/v2/links" description="Get paginated list of links for the authenticated workspace." />
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Query Parameters</h4>
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--ds-neutral-50)] border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Param</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Default</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-4 py-2 font-mono text-xs">offset</td><td className="px-4 py-2">integer</td><td className="px-4 py-2">0</td><td className="px-4 py-2 text-muted-foreground">Number of results to skip</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">limit</td><td className="px-4 py-2">integer</td><td className="px-4 py-2">50</td><td className="px-4 py-2 text-muted-foreground">Max results per page</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">search</td><td className="px-4 py-2">string</td><td className="px-4 py-2">—</td><td className="px-4 py-2 text-muted-foreground">Filter by slug, title, or destination</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">sortBy</td><td className="px-4 py-2">string</td><td className="px-4 py-2">createdAt</td><td className="px-4 py-2 text-muted-foreground"><Code>createdAt</Code>, <Code>slug</Code>, <Code>totalClicks</Code></td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">sortOrder</td><td className="px-4 py-2">string</td><td className="px-4 py-2">desc</td><td className="px-4 py-2 text-muted-foreground"><Code>asc</Code> or <Code>desc</Code></td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Response</h4>
              <CodeBlock code={`{
  "data": [
    {
      "id": "uuid",
      "slug": "my-slug",
      "destination": "https://example.com",
      "title": "My Link",
      "totalClicks": 42,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      ...
    }
  ],
  "meta": { "total": 100, "offset": 0, "limit": 50 }
}`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Create a Link</h3>
              <Endpoint method="POST" path="/v2/links" description="Create a new short link (secret key required)." />
              <p className="text-muted-foreground text-sm mb-3">Secret keys only. Body (JSON):</p>
              <CodeBlock code={`{
  "destination": "https://example.com/long-url",  // required
  "slug": "custom-slug",                          // auto-generated if omitted
  "title": "My Link",
  "description": "Campaign landing page",
  "tags": ["marketing", "launch"],
  "password": "secret123",
  "expiresAt": "2026-12-31T23:59:59Z",
  "clickLimit": 1000,
  "utmSource": "newsletter",
  "utmMedium": "email",
  "utmCampaign": "spring-launch",
  "utmTerm": "keywords",
  "utmContent": "hero-banner",
  "ogTitle": "Open Graph Title",
  "ogDescription": "OG description",
  "ogImage": "https://example.com/og.png",
  "iosDestination": "https://apps.apple.com/...",
  "androidDestination": "https://play.google.com/...",
  "abTestEnabled": false
}`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Get a Link</h3>
              <Endpoint method="GET" path="/v2/links/:id" description="Get a single link by ID." />
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  https://api.linkforge.app/v2/links/link-id`} lang="bash" />

              <h3 className="text-lg font-semibold mb-3 mt-8">Update a Link</h3>
              <Endpoint method="PATCH" path="/v2/links/:id" description="Update link fields (secret key required)." />

              <h3 className="text-lg font-semibold mb-3 mt-8">Delete a Link</h3>
              <Endpoint method="DELETE" path="/v2/links/:id" description="Deactivate a link (secret key required)." />
              <p className="text-muted-foreground text-sm">Links are soft-deleted by setting <Code>isActive: false</Code>.</p>
            </Section>

            {/* ─── Analytics API ──────────────────────────── */}
            <Section id="analytics">
              <h2 className="text-2xl font-bold mb-4">Analytics API</h2>

              <h3 className="text-lg font-semibold mb-3 mt-8">Overview</h3>
              <Endpoint method="GET" path="/v2/analytics/overview" description="Get aggregate analytics for the workspace." />
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Query Parameters</h4>
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--ds-neutral-50)] border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Param</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Default</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-4 py-2 font-mono text-xs">range</td><td className="px-4 py-2">string</td><td className="px-4 py-2">30d</td><td className="px-4 py-2 text-muted-foreground"><Code>7d</Code>, <Code>30d</Code>, <Code>90d</Code>, or <Code>custom</Code></td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">from</td><td className="px-4 py-2">ISO date</td><td className="px-4 py-2">—</td><td className="px-4 py-2 text-muted-foreground">Start date (required if range=custom)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">to</td><td className="px-4 py-2">ISO date</td><td className="px-4 py-2">—</td><td className="px-4 py-2 text-muted-foreground">End date (required if range=custom)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">linkId</td><td className="px-4 py-2">uuid</td><td className="px-4 py-2">—</td><td className="px-4 py-2 text-muted-foreground">Filter to a single link</td></tr>
                  </tbody>
                </table>
              </div>
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

              <h3 className="text-lg font-semibold mb-3 mt-8">Breakdown</h3>
              <Endpoint method="GET" path="/v2/analytics/breakdown" description="Get click breakdown by dimension." />
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Query Parameters</h4>
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--ds-neutral-50)] border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Param</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Default</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-4 py-2 font-mono text-xs">dimension</td><td className="px-4 py-2">string</td><td className="px-4 py-2">country</td><td className="px-4 py-2 text-muted-foreground"><Code>country</Code>, <Code>device</Code>, <Code>browser</Code>, <Code>os</Code>, or <Code>referrer</Code></td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">range</td><td className="px-4 py-2">string</td><td className="px-4 py-2">7d</td><td className="px-4 py-2 text-muted-foreground"><Code>7d</Code>, <Code>30d</Code>, <Code>90d</Code>, <Code>custom</Code></td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">linkId</td><td className="px-4 py-2">uuid</td><td className="px-4 py-2">—</td><td className="px-4 py-2 text-muted-foreground">Filter to a single link</td></tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock code={`{
  "data": [
    { "label": "United States 🇺🇸", "clicks": 5400, "percentage": 35.4 },
    { "label": "United Kingdom 🇬🇧", "clicks": 2100, "percentage": 13.8 }
  ]
}`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Timeseries</h3>
              <Endpoint method="GET" path="/v2/analytics/timeseries" description="Get click volume over time." />
              <p className="text-muted-foreground text-sm mb-3">Supports <Code>groupBy=hour</Code> or <Code>groupBy=day</Code> (default).</p>
              <CodeBlock code={`{
  "data": [
    { "date": "Jan 1", "clicks": 450, "uniqueClicks": 320 },
    { "date": "Jan 2", "clicks": 520, "uniqueClicks": 380 }
  ]
}`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Top Links</h3>
              <Endpoint method="GET" path="/v2/analytics/top-links" description="Get top-performing links with 7-day trend." />
              <p className="text-muted-foreground text-sm mb-3">Query params: <Code>range</Code>, <Code>limit</Code> (default 10), <Code>from</Code>, <Code>to</Code>.</p>
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

            {/* ─── QR Code API ────────────────────────────── */}
            <Section id="qr">
              <h2 className="text-2xl font-bold mb-4">QR Code API</h2>
              <Endpoint method="GET" path="/v2/qr" description="Generate a QR code PNG image." />
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Query Parameters</h4>
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--ds-neutral-50)] border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Param</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Default</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-4 py-2 font-mono text-xs">url</td><td className="px-4 py-2">string</td><td className="px-4 py-2">—</td><td className="px-4 py-2 text-muted-foreground">The URL to encode (required)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">size</td><td className="px-4 py-2">integer</td><td className="px-4 py-2">512</td><td className="px-4 py-2 text-muted-foreground">Image size in px (64–2048)</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">fgColor</td><td className="px-4 py-2">hex</td><td className="px-4 py-2">#000000</td><td className="px-4 py-2 text-muted-foreground">Foreground colour</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">bgColor</td><td className="px-4 py-2">hex</td><td className="px-4 py-2">#ffffff</td><td className="px-4 py-2 text-muted-foreground">Background colour or <Code>transparent</Code></td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">errorLevel</td><td className="px-4 py-2">string</td><td className="px-4 py-2">M</td><td className="px-4 py-2 text-muted-foreground"><Code>L</Code>, <Code>M</Code>, <Code>Q</Code>, or <Code>H</Code></td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm mb-3">Returns a PNG image (<Code>image/png</Code>). The response is the raw binary, not JSON.</p>
              <CodeBlock code={`curl -H "Authorization: Bearer lf_sk_..." \\
  "https://api.linkforge.app/v2/qr?url=https://example.com&size=512" \\
  --output qr.png`} lang="bash" />
            </Section>

            {/* ─── Workspace API ──────────────────────────── */}
            <Section id="workspace">
              <h2 className="text-2xl font-bold mb-4">Workspace API</h2>
              <Endpoint method="GET" path="/v2/workspace" description="Get the current workspace details." />
              <Endpoint method="PATCH" path="/v2/workspace" description="Update workspace name or logo (secret key required)." />
            </Section>

            {/* ─── API Keys ───────────────────────────────── */}
            <Section id="keys">
              <h2 className="text-2xl font-bold mb-4">API Keys</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Manage API keys programmatically. These endpoints are authenticated via Clerk (dashboard session), not by API key.
              </p>
              <Endpoint method="GET" path="/v2/keys" description="List all API keys for the workspace." />
              <Endpoint method="POST" path="/v2/keys" description="Create a new API key." />
              <p className="text-muted-foreground text-sm mb-3">Body: <Code>{`{ "name": "My Key", "keyType": "secret" }`}</Code>. <Code>keyType</Code> can be <Code>secret</Code> (default) or <Code>publishable</Code>.</p>
              <CodeBlock code={`// Response — the plaintextKey is returned once only
{
  "data": {
    "name": "My Key",
    "keyPrefix": "lf_sk_a1b2c3d4...",
    "keyType": "secret",
    "plaintextKey": "lf_sk_a1b2c3d4e5f6..."
  }
}`} />
              <Endpoint method="DELETE" path="/v2/keys/:id" description="Revoke (deactivate) an API key." />
            </Section>

            {/* ─── TypeScript SDK ─────────────────────────── */}
            <Section id="sdk">
              <h2 className="text-2xl font-bold mb-4">TypeScript SDK</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The <Code>linkforge-sdk</Code> package is a first-party TypeScript client for the LinkForge API. It uses native <Code>fetch</Code>, works in Node.js 18+, Edge Runtimes, and modern browsers.
              </p>

              <h3 className="text-lg font-semibold mb-3">Installation</h3>
              <CodeBlock code={`npm install linkforge-sdk`} lang="bash" />

              <h3 className="text-lg font-semibold mb-3 mt-8">Setup</h3>
              <CodeBlock code={`import { LinkForgeClient } from "linkforge-sdk";

const client = new LinkForgeClient({
  apiKey: "lf_sk_your-secret-key",
  // baseUrl: "https://api.linkforge.app",  // optional
});`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Links</h3>
              <CodeBlock code={`// List with pagination
const { data: links, meta } = await client.links.list({
  offset: 0,
  limit: 20,
  search: "example",
});

// Get by ID
const link = await client.links.get("link-id");

// Create
const newLink = await client.links.create({
  destination: "https://example.com",
  slug: "my-slug",        // auto-generated if omitted
  title: "My Link",
  tags: ["marketing"],
});

// Update
const updated = await client.links.update("link-id", {
  title: "New Title",
  isActive: true,
});

// Delete (deactivates)
const result = await client.links.delete("link-id");`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Analytics</h3>
              <CodeBlock code={`// Overview
const overview = await client.analytics.overview({ range: "30d" });

// Breakdown by dimension
const byCountry = await client.analytics.breakdown({
  dimension: "country",
  range: "7d",
});

// Timeseries
const daily = await client.analytics.timeseries({
  groupBy: "day",
  range: "30d",
});

// Top links
const topLinks = await client.analytics.topLinks({
  range: "7d",
  limit: 10,
});`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">QR Codes</h3>
              <CodeBlock code={`// Get raw PNG bytes
const buffer: ArrayBuffer = await client.qr.generate({
  url: "https://example.com",
  size: 256,
  fgColor: "#000000",
});

// Get data URL (e.g. for <img> tags)
const dataUrl = await client.qr.generateDataURL({
  url: "https://example.com",
});`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Workspace & Keys</h3>
              <CodeBlock code={`// Get workspace info
const ws = await client.workspace.get();

// Update workspace name
await client.workspace.patch({ name: "New Name" });

// List API keys
const keys = await client.keys.list();

// Create a key
const created = await client.keys.create("CI/CD Key", "secret");

// Revoke a key
await client.keys.revoke("key-id");`} />

              <h3 className="text-lg font-semibold mb-3 mt-8">Key Type Detection</h3>
              <CodeBlock code={`client.getKeyType();
// → "secret" | "publishable"`} />
            </Section>

            {/* ─── Errors ─────────────────────────────────── */}
            <Section id="errors">
              <h2 className="text-2xl font-bold mb-4">Error Handling</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                All API errors return a consistent JSON shape with an <Code>error</Code> object.
              </p>
              <CodeBlock code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Must be a valid URL"
  }
}`} />
              <h3 className="text-lg font-semibold mb-3 mt-8">Error Codes</h3>
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--ds-neutral-50)] border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Code</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-4 py-2 font-mono text-xs">UNAUTHORIZED</td><td className="px-4 py-2">401</td><td className="px-4 py-2 text-muted-foreground">Missing or invalid API key</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">FORBIDDEN</td><td className="px-4 py-2">403</td><td className="px-4 py-2 text-muted-foreground">Publishable key used for a mutation</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">NOT_FOUND</td><td className="px-4 py-2">404</td><td className="px-4 py-2 text-muted-foreground">Resource not found</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">CONFLICT</td><td className="px-4 py-2">409</td><td className="px-4 py-2 text-muted-foreground">Slug already taken</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">VALIDATION_ERROR</td><td className="px-4 py-2">422</td><td className="px-4 py-2 text-muted-foreground">Invalid request body</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">RATE_LIMITED</td><td className="px-4 py-2">429</td><td className="px-4 py-2 text-muted-foreground">Rate limit exceeded</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">FEATURE_NOT_AVAILABLE</td><td className="px-4 py-2">402</td><td className="px-4 py-2 text-muted-foreground">Plan upgrade required</td></tr>
                    <tr><td className="px-4 py-2 font-mono text-xs">INTERNAL_ERROR</td><td className="px-4 py-2">500</td><td className="px-4 py-2 text-muted-foreground">Server error</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mb-3 mt-8">SDK Error Classes</h3>
              <CodeBlock code={`import {
  LinkForgeError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "linkforge-sdk";

try {
  await client.links.create({ destination: "bad-url" });
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.message, err.details);
  } else if (err instanceof RateLimitError) {
    console.error(\`Retry after \${err.resetTime}\`);
  } else if (err instanceof LinkForgeError) {
    console.error(\`\${err.code}: \${err.message}\`);
  }
}`} />
            </Section>

            {/* ─── Rate Limits ───────────────────────────── */}
            <Section id="rate-limits">
              <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Rate limits are applied per workspace per hour based on your plan tier. Exceeded requests receive a <Code>429</Code> response.
              </p>
              <div className="overflow-x-auto rounded-xl border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--ds-neutral-50)] border-b border-border">
                      <th className="text-left px-4 py-2 font-medium">Plan</th>
                      <th className="text-left px-4 py-2 font-medium">Requests / Hour</th>
                      <th className="text-left px-4 py-2 font-medium">Headers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="px-4 py-2">Free</td><td className="px-4 py-2 font-mono">100</td><td className="px-4 py-2 text-muted-foreground text-xs" rowSpan={5}><Code>X-RateLimit-Limit</Code>, <Code>X-RateLimit-Remaining</Code>, <Code>X-RateLimit-Reset</Code>, <Code>Retry-After</Code></td></tr>
                    <tr><td className="px-4 py-2">Starter</td><td className="px-4 py-2 font-mono">1,000</td></tr>
                    <tr><td className="px-4 py-2">Growth</td><td className="px-4 py-2 font-mono">5,000</td></tr>
                    <tr><td className="px-4 py-2">Agency</td><td className="px-4 py-2 font-mono">20,000</td></tr>
                    <tr><td className="px-4 py-2">Business</td><td className="px-4 py-2 font-mono">50,000</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Tip:</strong> Monitor your usage with the rate limit response headers. When <Code>X-RateLimit-Remaining</Code> reaches 0, back off until the window resets.
              </div>
            </Section>

            {/* Footer */}
            <div className="mt-20 border-t border-border pt-8 text-sm text-muted-foreground">
              <p>Need help? Contact <a href="mailto:support@linkforge.app" className="text-[var(--ds-primary)] hover:underline">support@linkforge.app</a></p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Key, BookOpen, Code2, Terminal, Webhook, ArrowUpRight, ChevronRight } from "lucide-react";

const sections = [
  {
    title: "Getting Started",
    description: "Learn the basics of the LinkForge API — authentication, endpoints, and rate limits.",
    icon: BookOpen,
    href: "#getting-started",
    items: [
      "Authenticate with Bearer tokens (secret or publishable keys)",
      "Base URL: <code>/api/v2</code>",
      "Rate limits based on your plan (Free: 100 req/hr)",
      "All responses return JSON with standard error codes",
    ],
  },
  {
    title: "API Keys",
    description: "Create and manage API keys for secure programmatic access.",
    icon: Key,
    href: "/dashboard/developers/api-keys",
    items: [
      "Secret keys (<code>lf_sk_...</code>) — full read/write access to your workspace",
      "Publishable keys (<code>lf_pk_...</code>) — read-only access for client-side apps",
      "Keys are hashed at rest; shown only once on creation",
      "Revoke compromised keys instantly",
    ],
  },
  {
    title: "Core Endpoints",
    description: "RESTful API for link management, analytics, and QR codes.",
    icon: Terminal,
    href: "#endpoints",
    items: [
      "<code>GET /api/v2/links</code> — List links (search, sort, paginate)",
      "<code>POST /api/v2/links</code> — Create a short link with UTM, OG tags, password, expiry",
      "<code>GET /api/v2/analytics/overview</code> — Workspace or per-link analytics summary",
      "<code>GET /api/v2/analytics/timeseries</code> — Daily click counts over a date range",
      "<code>GET /api/v2/analytics/breakdown</code> — Clicks grouped by country, device, browser, referrer",
    ],
  },
  {
    title: "SDK & Client Libraries",
    description: "Official SDKs for popular languages and frameworks.",
    icon: Code2,
    href: "#sdks",
    comingSoon: true,
    items: [
      "JavaScript / TypeScript — <code>npm install linkforge-sdk</code>",
      "Python — <code>pip install linkforge</code>",
      "Go — <code>go get github.com/linkforge/sdk-go</code>",
      "curl — Ready-to-use examples in every endpoint doc",
    ],
  },
  {
    title: "Webhooks",
    description: "Receive real-time notifications when your links are clicked.",
    icon: Webhook,
    href: "#webhooks",
    comingSoon: true,
    items: [
      "Subscribe to <code>link.clicked</code> events with a POST URL",
      "Payload includes IP, user agent, country, device, referrer",
      "Retry with exponential backoff on failure",
      "Verify webhook signatures for authenticity",
    ],
  },
];

export default function DevelopersPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Developers</h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-600">
          Build with LinkForge. Integrate link shortening, click analytics, and QR code generation
          directly into your applications using our REST API and official SDKs.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/developers/api-keys"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Key className="h-4 w-4" />
            Get API Keys
          </Link>
        </div>
      </div>

      {/* Sections */}
      <div className="grid gap-6">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <section.icon className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
              {section.comingSoon && (
                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  Coming Soon
                </span>
              )}
            </div>

            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>

            {section.href.startsWith("/") && !section.href.startsWith("#") && (
              <Link
                href={section.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Manage API Keys
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link2, ChartLine, Sparkles, ArrowRight, ShieldCheck, Globe2,
  QrCode, Smartphone, TestTubes, Lock, Star,
  Layers, BarChart3, Users, Shield, Zap,
  Brain, Command, RefreshCw, CheckCircle2, Building2,
  Infinity, MapPin, KeyRound, Webhook, GitMerge, Palette,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { AccordionFeatures } from "@/components/marketing/AccordionFeatures";
import { BorderBeam } from "@/components/ui/border-beam";
import { Footer } from "@/components/marketing/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ds-primary)]/10 text-[var(--ds-primary)] text-xs font-semibold mb-4 ${className}`}>
      {children}
    </div>
  );
}

function TestimonialCard({ quote, name, role, company }: {
  quote: string; name: string; role: string; company: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--ds-border)] bg-white p-6 hover:border-[var(--ds-primary)]/20 transition-colors">
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-[var(--ds-text-primary)] leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
      <div>
        <p className="text-sm font-semibold text-[var(--ds-text-primary)]">{name}</p>
        <p className="text-xs text-[var(--ds-text-secondary)]">{role}, {company}</p>
      </div>
    </div>
  );
}

function PlanCard({ name, price, period, desc, features, cta, highlighted, badge }: {
  name: string; price: string; period?: string; desc: string;
  features: string[]; cta: string; highlighted?: boolean; badge?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-2xl border p-6 transition-all duration-300 relative overflow-hidden ${
        highlighted
          ? "border-[var(--ds-primary)] shadow-lg shadow-[var(--ds-primary)]/10 bg-white"
          : "border-[var(--ds-border)] bg-white hover:border-[var(--ds-primary)]/30"
      }`}
    >
      {highlighted && (
        <BorderBeam size={180} duration={10} delay={0} colorFrom="#433BFF" colorTo="#7c3aed" />
      )}
      {badge && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--ds-primary)] text-white text-[10px] font-semibold uppercase tracking-wider z-10">
          {badge}
        </div>
      )}
      <div className="text-center mb-5 relative z-10">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-1">{name}</h3>
        <div className="flex items-baseline justify-center gap-0.5">
          <span className="text-3xl font-bold text-[var(--ds-text-primary)]">{price}</span>
          {period && <span className="text-xs text-[var(--ds-text-secondary)]">{period}</span>}
        </div>
        <p className="text-xs text-[var(--ds-text-secondary)] mt-1.5">{desc}</p>
      </div>
      <ul className="space-y-2 mb-6 relative z-10">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-[var(--ds-text-secondary)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ds-accent)] shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 ${
          highlighted
            ? "bg-[var(--ds-primary)] text-white hover:bg-[var(--ds-primary-dark)] shadow-md shadow-[var(--ds-primary)]/25"
            : "border border-[var(--ds-border)] text-[var(--ds-text-primary)] hover:border-[var(--ds-primary)]/30"
        }`}
      >
        {cta}
      </Link>
    </motion.div>
  );
}

const companies = [
  "Vercel", "Product Hunt", "Raycast", "Customer.io", "Personality",
  "Maybe Finance", "Cal.com", "Clerk",
];

const plans = [
  {
    name: "Free", price: "$0", period: "/mo", desc: "Start without a credit card",
    features: ["50 links per month", "1 bio page", "50 QR codes", "Real-time analytics", "UTM builder", "Password protection"],
    cta: "Start free",
  },
  {
    name: "Starter", price: "$29", period: "/mo", desc: "For professionals who need branded links",
    features: ["Unlimited links", "5 bio pages", "Unlimited QR codes", "Custom domains", "A/B testing", "3 team members", "Deep linking", "API access"],
    cta: "Start 14-day trial", highlighted: true, badge: "Most popular",
  },
  {
    name: "Growth", price: "$79", period: "/mo", desc: "For teams scaling their marketing",
    features: ["Unlimited everything", "10 bio pages", "White-label", "10 team members", "1-year data retention", "Bulk create", "Webhooks", "Link safety"],
    cta: "Start 14-day trial",
  },
  {
    name: "Enterprise", price: "Custom", desc: "For organizations with advanced requirements",
    features: ["Unlimited everything", "SAML SSO / Azure AD", "Custom SLA (99.99%)", "10-year retention", "Dedicated support", "Onboarding assistance", "Custom contracts", "SOC 2 reports"],
    cta: "Contact sales",
  },
];

const TABS = [
  { id: "links", label: "Smart Links", icon: Link2 },
  { id: "bio", label: "Bio Pages", icon: Layers },
  { id: "qr", label: "QR Codes", icon: QrCode },
] as const;

type TabId = (typeof TABS)[number]["id"];

function HeroProductCard({ tab }: { tab: TabId }) {
  switch (tab) {
    case "links":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--ds-border)]">
            <Link2 className="w-4 h-4 text-[var(--ds-text-secondary)]" />
            <input
              type="text"
              placeholder="Paste a long URL to shorten..."
              className="flex-1 bg-transparent text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-secondary)] focus:outline-none"
            />
          </div>
          <div className="p-0">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--ds-border)] p-1.5 bg-neutral-50/50">
              <span className="px-2 text-sm text-[var(--ds-text-secondary)] font-medium font-mono">pivot.url/</span>
              <input
                type="text"
                placeholder="your-link"
                className="flex-1 text-sm font-semibold text-[var(--ds-text-primary)] bg-transparent focus:outline-none placeholder:text-neutral-300"
              />
              <button className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--ds-primary)] px-4 text-xs font-semibold text-white hover:bg-[var(--ds-primary-dark)] transition-colors shrink-0">
                Shorten
              </button>
            </div>
            <div className="mt-3 px-1 flex items-center gap-4 text-xs text-[var(--ds-text-secondary)]">
              <span className="flex items-center gap-1.5"><ChartLine className="w-3.5 h-3.5" /> Free analytics</span>
              <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5" /> Custom domains</span>
              <span className="flex items-center gap-1.5"><TestTubes className="w-3.5 h-3.5" /> A/B testing</span>
            </div>
          </div>
        </div>
      );
    case "bio":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              P
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ds-text-primary)]">pivot.url/@username</p>
              <p className="text-xs text-[var(--ds-text-secondary)]">Your bio page &mdash; always live</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["Link in bio", "Featured post", "Newsletter", "Shop"].map((label) => (
              <div key={label} className="rounded-lg border border-[var(--ds-border)] bg-neutral-50/50 px-3 py-2 text-xs font-medium text-[var(--ds-text-primary)]">
                {label}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--ds-text-secondary)]">
            <Palette className="w-3.5 h-3.5" /> 19 block types &bull; Custom themes &bull; Drag-and-drop
          </div>
        </div>
      );
    case "qr":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32 bg-white rounded-xl border border-[var(--ds-border)] p-2 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="10" y="10" width="30" height="30" rx="3" fill="var(--ds-text-primary)" />
                <rect x="15" y="15" width="20" height="20" fill="white" />
                <rect x="60" y="10" width="30" height="30" rx="3" fill="var(--ds-text-primary)" />
                <rect x="65" y="15" width="20" height="20" fill="white" />
                <rect x="10" y="60" width="30" height="30" rx="3" fill="var(--ds-text-primary)" />
                <rect x="15" y="65" width="20" height="20" fill="white" />
                <rect x="50" y="50" width="8" height="8" fill="var(--ds-text-primary)" />
                <rect x="62" y="50" width="6" height="6" fill="var(--ds-text-primary)" />
                <rect x="72" y="50" width="6" height="12" fill="var(--ds-text-primary)" />
                <rect x="50" y="62" width="6" height="6" fill="var(--ds-text-primary)" />
                <rect x="60" y="62" width="12" height="6" fill="var(--ds-text-primary)" />
                <rect x="50" y="72" width="16" height="6" fill="var(--ds-text-primary)" />
                <rect x="70" y="72" width="6" height="6" fill="var(--ds-text-primary)" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-[var(--ds-text-secondary)]">
            <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Custom colors &amp; logo</span>
            <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Edit without reprinting</span>
          </div>
        </div>
      );
  }
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<TabId>("links");
  const [shortUrlInput, setShortUrlInput] = useState("");

  return (
    <div className="min-h-screen bg-white text-[var(--ds-text-primary)] antialiased">
      <Header />

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ds-primary)]/[0.03] to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionLabel>
                <Sparkles className="w-3 h-3" />
                Link management platform
              </SectionLabel>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--ds-text-primary)] leading-[1.08]"
            >
              Links you can edit.
              <br />
              <span className="text-[var(--ds-primary)]">Pages that perform.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 text-base sm:text-lg text-[var(--ds-text-secondary)] max-w-lg mx-auto leading-relaxed"
            >
              Short links, bio pages, and QR codes that you can update anytime &mdash;
              without breaking what you&apos;ve already published.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex items-center justify-center gap-3 flex-wrap"
            >
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--ds-primary)] px-6 text-sm font-semibold text-white transition-all hover:bg-[var(--ds-primary-dark)] active:scale-[0.98] shadow-lg shadow-[var(--ds-primary)]/25"
              >
                Start for free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--ds-border)] bg-white px-6 text-sm font-semibold text-[var(--ds-text-secondary)] transition-all hover:border-[var(--ds-primary)]/30 hover:text-[var(--ds-text-primary)]"
              >
                See features
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--ds-text-secondary)]"
            >
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> No credit card</span>
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> Setup in 30s</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> Edit anytime</span>
            </motion.div>
          </div>

          {/* Tabbed product showcase */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-12 sm:mt-16 max-w-2xl mx-auto"
          >
            {/* Tab bar */}
            <div className="flex items-center justify-center rounded-xl bg-[#F8FAFC] border border-[var(--ds-border)] p-1 mb-5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === id
                      ? "bg-white text-[var(--ds-text-primary)] shadow-sm border border-[var(--ds-border)]"
                      : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Showcase card with border beam */}
            <div className="relative rounded-2xl border border-[var(--ds-border)] bg-white p-5 shadow-sm overflow-hidden">
              <BorderBeam
                size={250}
                duration={12}
                delay={0}
                colorFrom="#433BFF"
                colorTo="#7c3aed"
              />
              <BorderBeam
                size={250}
                duration={12}
                delay={6}
                anchor={180}
                colorFrom="#7c3aed"
                colorTo="#ec4899"
              />
              <div className="relative z-10">
                <HeroProductCard tab={activeTab} />
                <div className="mt-4 pt-4 border-t border-[var(--ds-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--ds-text-secondary)]">
                    <span className="font-semibold text-[var(--ds-primary)]">Free</span> &mdash; 50 links, 1 bio page, 50 QR codes
                  </span>
                  <Link
                    href="/sign-up"
                    className="text-xs font-semibold text-[var(--ds-primary)] hover:underline flex items-center gap-1"
                  >
                    Try it <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 2. TRUST BAR ═══════════ */}
      <section className="py-10 border-t border-[var(--ds-border)] bg-[#F8FAFC]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs text-[var(--ds-text-secondary)] text-center font-medium tracking-widest uppercase mb-5">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {companies.map((name) => (
              <span key={name} className="text-sm font-semibold text-[var(--ds-text-secondary)]/60 hover:text-[var(--ds-text-secondary)]/90 transition-colors">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 3. THE WEDGE — EDIT ANYTIME ═══════════ */}
      <section id="features" className="relative py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[var(--ds-primary)]/[0.04] to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[var(--ds-primary)]/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <SectionLabel>Never break a link</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Published it. Change it. <span className="text-[var(--ds-primary)]">Nothing breaks.</span>
            </h2>
            <p className="mt-3 text-base text-[var(--ds-text-secondary)] max-w-xl mx-auto">
              Most link tools treat your links as permanent. We don&apos;t. Change any destination, block, or QR target at any time &mdash; the published link, page, or code keeps working.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Link2, title: "Short Links",
                steps: [
                  { label: "Published", value: "pivot.url/sale2024" },
                  { label: "Edited", value: "→ pivot.url/sale2025", highlight: true },
                ],
                desc: "Campaign ended? Change the destination. Every existing redirect, QR code, and embed keeps working.",
                accent: "from-blue-500/20 to-indigo-500/10",
              },
              {
                icon: Layers, title: "Bio Pages",
                steps: [
                  { label: "Published", value: "pivot.url/@username" },
                  { label: "Edited", value: "→ new blocks, new theme", highlight: true },
                ],
                desc: "Swap blocks, change themes, update links. Your published URL never changes. Followers always see the latest.",
                accent: "from-purple-500/20 to-pink-500/10",
              },
              {
                icon: QrCode, title: "QR Codes",
                steps: [
                  { label: "Published", value: "Printed on 10,000 flyers" },
                  { label: "Edited", value: "→ Updated destination URL", highlight: true },
                ],
                desc: "Change the target URL without regenerating or reprinting the code. That expensive print run stays live forever.",
                accent: "from-emerald-500/20 to-teal-500/10",
              },
            ].map(({ icon: Icon, title, steps, desc, accent }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="group relative rounded-2xl border border-[var(--ds-border)] bg-white p-6 hover:shadow-xl hover:shadow-[var(--ds-primary)]/5 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--ds-primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-[var(--ds-primary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--ds-text-primary)]">{title}</h3>
                  </div>

                  <div className="mb-5">
                    {steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-l-2 border-[var(--ds-border)] pl-4 relative">
                        <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${
                          s.highlight
                            ? "bg-[var(--ds-primary)] border-[var(--ds-primary)]"
                            : "bg-white border-[var(--ds-border)]"
                        }`} />
                        <div className="flex items-center gap-2 font-mono text-xs">
                          {s.highlight ? (
                            <span className="text-[var(--ds-primary)] font-semibold">{s.value}</span>
                          ) : (
                            <span className="text-[var(--ds-text-secondary)]">{s.value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-[var(--ds-text-secondary)] leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 4. DEEP DIVE — ACCORDION ═══════════ */}
      <AccordionFeatures />

      {/* ═══════════ 5. FEATURE SHOWCASE ═══════════ */}
      <section className="relative py-20 sm:py-24 bg-[#F8FAFC] border-t border-[var(--ds-border)] overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gradient-to-l from-[var(--ds-primary)]/[0.05] to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <SectionLabel>Everything you need</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              From brand to enterprise.<br />
              <span className="text-[var(--ds-primary)]">One platform covers it.</span>
            </h2>
            <p className="mt-3 text-base text-[var(--ds-text-secondary)] max-w-lg mx-auto">
              Every feature engineers, marketers, and security teams ask for — built in, not bolted on.
            </p>
          </motion.div>

          {/* Primary features — 3x2 grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
          >
            {[
              { icon: Globe2, title: "Custom domains", desc: "Bring your own domain for short links, bio pages, and QR codes. Professional branding in seconds.", plan: "Starter", featured: true },
              { icon: ChartLine, title: "Real-time analytics", desc: "Device, location, referrer breakdowns with AI-powered anomaly detection. Free on every plan.", plan: "Free", featured: false },
              { icon: TestTubes, title: "A/B testing", desc: "Split-test up to 4 destinations from one short link. Bayesian stats picks the winner automatically.", plan: "Starter", featured: false },
              { icon: Users, title: "Team collaboration", desc: "Invite teammates with role-based access. Audit logs, shared workspaces, and link ownership.", plan: "Starter", featured: false },
              { icon: Shield, title: "Link safety scanning", desc: "Automated malware detection via Cloudflare URL Scanner. Trust scores, phishing alerts, SOC 2.", plan: "Growth", featured: false },
              { icon: Smartphone, title: "Deep linking", desc: "Universal Links & App Links auto-configured. Route mobile traffic straight into your app.", plan: "Starter", featured: false },
            ].map(({ icon: Icon, title, desc, plan, featured }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className={`group relative rounded-xl border bg-white p-5 transition-all duration-300 ${
                  featured
                    ? "border-[var(--ds-primary)]/20 hover:border-[var(--ds-primary)]/40 shadow-sm hover:shadow-lg hover:shadow-[var(--ds-primary)]/10"
                    : "border-[var(--ds-border)] hover:border-[var(--ds-primary)]/30 hover:shadow-md"
                }`}
              >
                {featured && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--ds-primary)] to-[var(--ds-primary)]/40 rounded-t-xl" />
                )}
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    featured
                      ? "bg-[var(--ds-primary)] text-white"
                      : "bg-[var(--ds-primary)]/10 text-[var(--ds-primary)] group-hover:bg-[var(--ds-primary)]/20"
                  } transition-colors duration-300`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--ds-text-primary)]">{title}</h3>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--ds-text-secondary)] bg-[var(--ds-border)] px-1.5 py-0.5 rounded shrink-0">{plan}</span>
                    </div>
                    <p className="text-sm text-[var(--ds-text-secondary)] leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Advanced features — compact 3x2 */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6"
          >
            {[
              { icon: GitMerge, title: "Multi-touch attribution" },
              { icon: MapPin, title: "Geo & device targeting" },
              { icon: KeyRound, title: "SAML SSO + Azure AD" },
              { icon: Webhook, title: "Webhooks via Svix" },
              { icon: Building2, title: "Custom SLA (99.99%)" },
              { icon: Lock, title: "Audit logs & RBAC" },
            ].map(({ icon: Icon, title }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="flex items-center gap-3 rounded-xl border border-[var(--ds-border)] bg-white/70 p-3.5 hover:bg-white hover:border-[var(--ds-primary)]/20 transition-all duration-300"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--ds-primary)]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[var(--ds-primary)]" />
                </div>
                <span className="text-sm font-medium text-[var(--ds-text-primary)]">{title}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Delight features — micro row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { icon: Brain, label: "AI slug suggestions" },
              { icon: Command, label: "Ctrl+K command palette" },
              { icon: RefreshCw, label: "Update QR without reprinting" },
              { icon: Zap, label: "1.5s link creation" },
            ].map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--ds-primary)]/[0.04] border border-[var(--ds-primary)]/10 px-3 py-2.5 hover:bg-[var(--ds-primary)]/[0.08] transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-[var(--ds-primary)] shrink-0" />
                <span className="text-xs font-medium text-[var(--ds-text-primary)]">{label}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="text-center mt-10"
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ds-primary)] hover:gap-2 transition-all"
            >
              Try every feature free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 6. ANALYTICS SHOWCASE ═══════════ */}
      <section className="py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <SectionLabel>Real-time analytics</SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)] mb-4">
                Know every click,<br />every scan, every view
              </h2>
              <p className="text-base text-[var(--ds-text-secondary)] leading-relaxed mb-6">
                Real-time analytics across all your links, bio pages, and QR codes.
                Device, location, referrer data &mdash; plus AI-powered insights that tell you what matters.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-2xl font-bold text-[var(--ds-accent)]">864k</p>
                  <p className="text-sm text-[var(--ds-text-secondary)]">Clicks tracked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--ds-accent)]">78k</p>
                  <p className="text-sm text-[var(--ds-text-secondary)]">Links created</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--ds-accent)]">123M</p>
                  <p className="text-sm text-[var(--ds-text-secondary)]">Events tracked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--ds-accent)]">30+</p>
                  <p className="text-sm text-[var(--ds-text-secondary)]">Countries reached</p>
                </div>
              </div>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ds-primary)] hover:gap-2 transition-all"
              >
                Start tracking <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-[var(--ds-border)] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--ds-border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--ds-primary)]/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[var(--ds-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ds-text-primary)]">Campaign Performance</p>
                    <p className="text-xs text-[var(--ds-text-secondary)]">Last 30 days</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--ds-accent)] bg-green-50 px-2 py-0.5 rounded-full">+12.5%</span>
              </div>

              <div className="h-28 rounded-xl bg-gradient-to-b from-[var(--ds-primary)]/[0.06] to-transparent p-3 mb-5 relative overflow-hidden">
                <svg viewBox="0 0 400 80" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#433BFF" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#433BFF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5 }}
                    d="M0,65 Q30,55 60,50 T120,35 T180,45 T240,25 T300,30 T400,10"
                    fill="none"
                    stroke="#433BFF"
                    strokeWidth="2.5"
                  />
                  <motion.path
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5 }}
                    d="M0,65 Q30,55 60,50 T120,35 T180,45 T240,25 T300,30 T400,10 L400,80 L0,80 Z"
                    fill="url(#chartGrad)"
                  />
                </svg>
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-md border border-[var(--ds-border)] px-2 py-1">
                  <p className="text-xs font-semibold text-[var(--ds-text-primary)]">2,481 clicks</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Mobile", pct: 65, color: "bg-[var(--ds-primary)]" },
                  { label: "Desktop", pct: 28, color: "bg-[var(--ds-primary)]/60" },
                  { label: "Tablet", pct: 7, color: "bg-[var(--ds-primary)]/30" },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--ds-text-secondary)] w-14">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className={`h-full rounded-full ${color}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[var(--ds-text-primary)] w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--ds-border)] grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Top Country", value: "United States" },
                  { label: "Top Device", value: "iPhone" },
                  { label: "Top Referrer", value: "Twitter" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-[var(--ds-text-secondary)]">{label}</p>
                    <p className="text-xs font-semibold text-[var(--ds-text-primary)] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 7. PRICING ═══════════ */}
      <section id="pricing" className="py-20 sm:py-24 bg-[#F8FAFC] border-t border-[var(--ds-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <SectionLabel>Simple pricing</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Start free. Upgrade when <br className="sm:hidden" />you need more.
            </h2>
            <p className="mt-3 text-base text-[var(--ds-text-secondary)] max-w-md mx-auto">
              No hidden fees, no surprises, no contracts. All plans include real-time analytics.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
          >
            {plans.map((plan) => (
              <PlanCard key={plan.name} {...plan} />
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--ds-text-secondary)]"
          >
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> SOC 2 compliant</span>
            <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5" /> GDPR ready</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> 256-bit encryption</span>
            <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" /> 99.99% uptime</span>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 8. TESTIMONIALS ═══════════ */}
      <section className="py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <SectionLabel>Trusted by teams</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Loved by marketers and developers
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto"
          >
            <TestimonialCard
              quote="PivotURL has been a game-changer for our marketing stack &mdash; not only providing a level of source attribution, but bringing a suite of tools for our marketing and growth teams."
              name="Johnny Ho"
              role="Co-founder"
              company="Personality"
            />
            <TestimonialCard
              quote="It&apos;s the critical infrastructure, the absolute load-bearing infrastructure of a modern software company. It integrates with everything we use &mdash; from HubSpot to Segment to Customer.io."
              name="Guillermo Rauch"
              role="CEO"
              company="Vercel"
            />
            <TestimonialCard
              quote="We&apos;ve been so confident in PivotURL that we&apos;ve used it for our public announcements of $4M seed and main. Incredibly reliable and robust."
              name="Josh Pigford"
              role="Founder"
              company="Maybe Finance"
            />
            <TestimonialCard
              quote="Switching to PivotURL gave us access to the insights I&apos;ve been looking for &mdash; internal product launches, cohort increased growth by 200% in 2 weeks. Incredible tool!"
              name="Jason Lisch"
              role="Head of Growth"
              company="Product Hunt"
            />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 9. FINAL CTA ═══════════ */}
      <section className="py-20 sm:py-24 bg-[var(--ds-primary)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
              Start building links<br />that work for you
            </h2>
            <p className="text-base text-white/70 max-w-md mx-auto mb-8">
              Free to start. No credit card required. Edit anytime.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-[var(--ds-primary)] transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg"
              >
                Start for free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                See all features
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

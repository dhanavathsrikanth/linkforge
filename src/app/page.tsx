"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link2, ChartLine, Sparkles, ArrowRight, ShieldCheck, Globe2,
  QrCode, Smartphone, TestTubes, Lock, Star,
  Layers, Users, Shield, Zap,
  Brain, Command, RefreshCw, CheckCircle2, Building2,
  Infinity, MapPin, KeyRound, Webhook, GitMerge,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { AccordionFeatures } from "@/components/marketing/AccordionFeatures";
import { BorderBeam } from "@/components/ui/border-beam";
import { Globe } from "@/components/ui/globe";
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

function HeroProductCard() {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");

  function submit() {
    if (!url.trim()) return;
    sessionStorage.setItem("pendingLinkDestination", url.trim());
    if (slug.trim()) sessionStorage.setItem("pendingLinkSlug", slug.trim());
    window.location.href = "/sign-up?pendingLink=1";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-1 items-center rounded-xl border border-[var(--ds-border)] bg-white px-3 focus-within:border-[var(--ds-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--ds-primary)]/10 transition-all shadow-sm">
          <Link2 className="w-4 h-4 text-[var(--ds-text-secondary)]/60 shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Paste a URL to shorten…"
            className="flex-1 border-0 bg-transparent px-2.5 py-2.5 text-sm outline-none placeholder:text-[var(--ds-text-secondary)]/40"
          />
        </div>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Custom slug (optional)"
          className="w-full sm:w-40 rounded-xl border border-[var(--ds-border)] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[var(--ds-text-secondary)]/40 focus:border-[var(--ds-primary)]/50 focus:ring-2 focus:ring-[var(--ds-primary)]/10 transition-all font-mono"
        />
        <button
          onClick={submit}
          disabled={!url.trim()}
          className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[var(--ds-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--ds-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Shorten
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [shortUrlInput, setShortUrlInput] = useState("");

  return (
    <div className="min-h-screen bg-white text-[var(--ds-text-primary)] antialiased">
      <Header />

      {/* ═══════════ 1. HERO ═══════════ */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden">
        {/* Globe background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]">
            <Globe />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ds-primary)]/[0.03] to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionLabel>
                <Zap className="w-3 h-3" />
                The edit-anywhere link platform
              </SectionLabel>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--ds-text-primary)] leading-[1.08]"
            >
              Publish once.
              <br />
              <span className="text-[var(--ds-primary)]">Update forever.</span>
              <br />
              Nothing breaks.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 text-base sm:text-lg text-[var(--ds-text-secondary)] max-w-lg mx-auto leading-relaxed"
            >
              Short links you can change anytime &mdash;
              without breaking what&apos;s already out there.
              Your redirects, embeds, and printed codes keep working.
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
                href="#how-it-works"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--ds-border)] bg-white px-6 text-sm font-semibold text-[var(--ds-text-secondary)] transition-all hover:border-[var(--ds-primary)]/30 hover:text-[var(--ds-text-primary)]"
              >
                See how it works
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--ds-text-secondary)]"
            >
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> No credit card</span>
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> 30-second setup</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-[var(--ds-accent)]" /> Edit without breaking</span>
            </motion.div>
          </div>

          {/* Tabbed product showcase */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-12 sm:mt-16 max-w-2xl mx-auto"
          >
            {/* Showcase card */}
            <div className="relative rounded-2xl border border-[var(--ds-border)] bg-white p-5 shadow-sm overflow-hidden">
              <div className="relative z-10">
                <HeroProductCard />
                <div className="mt-4 pt-4 border-t border-[var(--ds-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--ds-text-secondary)]">
                    <span className="font-semibold text-[var(--ds-primary)]">Free</span> &mdash; 50 links
                  </span>
                  <Link
                    href="/sign-up"
                    className="text-xs font-semibold text-[var(--ds-primary)] hover:underline flex items-center gap-1"
                  >
                    Try it <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <BorderBeam
                duration={6}
                size={400}
                className="from-transparent via-violet-500 to-transparent"
              />
              <BorderBeam
                duration={6}
                delay={3}
                size={400}
                borderWidth={2}
                className="from-transparent via-fuchsia-500 to-transparent"
              />
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

      {/* ═══════════ 3. HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="relative py-20 sm:py-24 border-t border-[var(--ds-border)] bg-[#F8FAFC] overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <SectionLabel>
              <Zap className="w-3 h-3" />
              Your journey in four steps
            </SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              From first click to <span className="text-[var(--ds-primary)]">full control</span>
            </h2>
            <p className="mt-3 text-base text-[var(--ds-text-secondary)] max-w-lg mx-auto">
              Create a link, share it everywhere, track every click, and change anything &mdash; all from one platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {[
              {
                step: "01", title: "Create", icon: Link2,
                desc: "Shorten a long URL or build a bio page in one click. Add custom slugs, UTM tags, and password protection.",
              },
              {
                step: "02", title: "Share", icon: Globe2,
                desc: "Deploy across social, email, SMS, and print. Generate QR codes that match your brand colors and logo.",
              },
              {
                step: "03", title: "Track", icon: ChartLine,
                desc: "Real-time analytics on clicks, scans, devices, locations, and referrers. AI-powered insights spot every trend.",
              },
              {
                step: "04", title: "Update", icon: RefreshCw,
                desc: "Change any destination, swap bio blocks, or retarget a QR code. Every published link, page, and code keeps working.",
              },
            ].map(({ step, title, icon: Icon, desc }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="relative"
              >
                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[75%] h-px border-t-2 border-dashed border-[var(--ds-primary)]/20" />
                )}
                <div className="relative rounded-2xl border border-[var(--ds-border)] bg-white p-6 hover:shadow-lg hover:shadow-[var(--ds-primary)]/5 transition-all duration-300 h-full">
                  <div className="text-3xl font-bold text-[var(--ds-primary)]/15 mb-3">{step}</div>
                  <div className="w-10 h-10 rounded-xl bg-[var(--ds-primary)]/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[var(--ds-primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-2">{title}</h3>
                  <p className="text-sm text-[var(--ds-text-secondary)] leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={fadeUp}
            className="text-center mt-10"
          >
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--ds-primary)] px-6 text-sm font-semibold text-white transition-all hover:bg-[var(--ds-primary-dark)] active:scale-[0.98] shadow-lg shadow-[var(--ds-primary)]/25"
            >
              Start your journey <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 4. THE WEDGE — EDIT ANYTIME ═══════════ */}
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
                  { label: "Published", value: "pivoturl.com/sale2024" },
                  { label: "Edited", value: "→ pivoturl.com/sale2025", highlight: true },
                ],
                desc: "Campaign ended? Change the destination. Every existing redirect, QR code, and embed keeps working.",
                accent: "from-blue-500/20 to-indigo-500/10",
              },
              {
                icon: Layers, title: "Bio Pages",
                steps: [
                  { label: "Published", value: "pivoturl.com/@username" },
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

            <div className="relative rounded-2xl border border-[var(--ds-border)] bg-white overflow-hidden aspect-square max-w-lg w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--ds-primary)]/[0.03] to-transparent pointer-events-none z-10" />
              <Globe />
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link2, ChartLine, ArrowRight, ShieldCheck, Globe2,
  QrCode, Smartphone, TestTubes, Lock, Star,
  Layers, Users, Shield, Zap,
  Brain, Command, RefreshCw, CheckCircle2, Building2,
  Infinity, MapPin, KeyRound, Webhook, GitMerge,
  Code2, Terminal, Check, Minus, Plus,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Hero } from "@/components/marketing/Hero";
import { FeatureSteps } from "@/components/marketing/FeatureSteps";
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
      className={`relative flex flex-1 flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
        highlighted
          ? "border-[var(--ds-primary)] shadow-lg shadow-[var(--ds-primary)]/10 bg-white"
          : "border-[var(--ds-border)] bg-white hover:border-[var(--ds-primary)]/30"
      }`}
    >
      {highlighted && (
        <BorderBeam size={180} duration={10} delay={0} colorFrom="#433BFF" colorTo="#7c3aed" />
      )}
      {badge && (
        <div className="bg-[var(--ds-primary)] absolute left-1/2 top-4 -translate-x-1/2 text-center text-xs font-medium text-white lg:text-sm">
          {badge}
        </div>
      )}
      <header className="flex flex-col gap-4 px-8 pb-0 pt-10">
        <div className="text-center text-3xl font-medium lg:text-4xl">
          {price}{period && <span className="text-sm text-[var(--ds-text-secondary)]">{period}</span>}
        </div>
        <div className="flex flex-col">
          <h5 className="text-center text-lg font-medium lg:text-xl">{name}</h5>
          <p className="text-center text-sm text-[var(--ds-text-secondary)] lg:text-base">{desc}</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-6 pb-12 lg:p-8">
        <ul className="flex flex-col gap-4">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 text-sm text-[var(--ds-text-secondary)] lg:text-base"
            >
              <CheckIcon className="mt-0.5 size-4 shrink-0 lg:size-5 text-[var(--ds-accent)]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <footer className="relative flex w-full items-center self-stretch p-8 pt-0">
        <Link
          href="/sign-up"
          className={`z-10 w-full inline-flex items-center justify-center h-10 px-5 text-sm md:text-base rounded-full font-medium transition-all ${
            highlighted
              ? "bg-[var(--ds-primary)] text-white hover:bg-[var(--ds-primary-dark)]"
              : "bg-[var(--ds-neutral-100)] text-[var(--ds-text-primary)] border border-[var(--ds-border)] hover:bg-[var(--ds-neutral-200)]"
          }`}
        >
          {cta}
        </Link>
      </footer>
    </motion.div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="border-b border-[var(--ds-border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 py-4 text-lg leading-relaxed font-medium tracking-tighter text-left hover:text-[var(--ds-primary)] transition-colors"
      >
        <span className="my-1.5 size-4 shrink-0 text-[var(--ds-text-secondary)]">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
        <span>{question}</span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="pl-7 text-[var(--ds-text-secondary)] leading-relaxed tracking-tight pb-4">
          {answer}
        </div>
      </motion.div>
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
    cta: "Start free — no card needed",
  },
  {
    name: "Starter", price: "$29", period: "/mo", desc: "For professionals who need branded links",
    features: ["Unlimited links", "5 bio pages", "Unlimited QR codes", "Custom domains", "A/B testing", "3 team members", "Deep linking", "API access"],
    cta: "Get started", highlighted: true, badge: "Most popular",
  },
  {
    name: "Growth", price: "$79", period: "/mo", desc: "For teams scaling their marketing",
    features: ["Unlimited everything", "10 bio pages", "White-label", "10 team members", "1-year data retention", "Bulk create", "Webhooks", "Link safety"],
    cta: "Get started",
  },
  {
    name: "Enterprise", price: "Custom", desc: "For organizations with advanced requirements",
    features: ["Unlimited everything", "SAML SSO / Azure AD", "Custom SLA (99.99%)", "10-year retention", "Dedicated support", "Onboarding assistance", "Custom contracts", "SOC 2 reports"],
    cta: "Contact sales",
  },
];

const faqItems = [
  {
    question: "What is a link management platform?",
    answer: "A link management platform lets you create, brand, track, and update short links at scale. Unlike basic URL shorteners, platforms like PivotURL provide real-time analytics, custom domains, QR codes, A/B testing, and team collaboration features.",
  },
  {
    question: "How does PivotURL differ from Bitly and Dub?",
    answer: "PivotURL combines the simplicity of Bitly with the attribution depth of Dub. We offer edit-anytime links (change destinations without breaking existing redirects), real-time conversion tracking, built-in affiliate programs, and transparent pricing — all in one platform.",
  },
  {
    question: "Can I use my own custom domain?",
    answer: "Yes! All paid plans include custom domain support. You can bring your own domain for short links, bio pages, and QR codes. Setup takes just a few minutes with automatic SSL and DNS verification.",
  },
  {
    question: "How does the attribution tracking work?",
    answer: "PivotURL tracks the entire customer journey from first click to final sale. We capture device, location, referrer, and UTM data in real-time, then match conversions back to the original link — giving you complete marketing attribution.",
  },
  {
    question: "Is there an API for developers?",
    answer: "Absolutely. We provide RESTful APIs with multi-language SDKs (TypeScript, Python, Go, Ruby, PHP), real-time webhooks, and comprehensive documentation. Our API handles millions of requests with 99.99% uptime.",
  },
  {
    question: "What about security and compliance?",
    answer: "PivotURL is SOC 2 compliant with 256-bit encryption, SAML SSO, audit logs, and role-based access control. We also include automated link safety scanning via Cloudflare URL Scanner to protect against phishing and malware.",
  },
];

const integrations = [
  { name: "Slack", desc: "Real-time notifications" },
  { name: "Zapier", desc: "5,000+ app connections" },
  { name: "Segment", desc: "Customer data platform" },
  { name: "HubSpot", desc: "CRM integration" },
  { name: "Salesforce", desc: "Enterprise CRM" },
  { name: "Stripe", desc: "Payment tracking" },
];

const apiFeatures = [
  { icon: Code2, title: "Multi-language SDKs", desc: "TypeScript, Python, Go, Ruby, and PHP" },
  { icon: Webhook, title: "Real-time webhooks", desc: "Get notified on every event" },
  { icon: Terminal, title: "RESTful API", desc: "99.99% uptime SLA" },
  { icon: Shield, title: "SOC 2 compliant", desc: "Enterprise-grade security" },
];

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-white text-[var(--ds-text-primary)] antialiased">
      <Header />

      {/* ═══════════ 1. HERO ═══════════ */}
      <Hero />

      {/* ═══════════ 2. COMPANIES - BaseHub scrolling pattern ═══════════ */}
      <section className="py-10 border-t border-[var(--ds-border)] bg-[#F8FAFC] overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs text-[var(--ds-text-secondary)] text-center font-medium tracking-widest uppercase mb-5">
            Trusted by teams at
          </p>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-[30vw] bg-transparent bg-gradient-to-r from-[#F8FAFC] z-10" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-[30vw] bg-transparent bg-gradient-to-l from-[#F8FAFC] z-10" />
            <div className="flex shrink-0 items-center gap-8 px-6 justify-center">
              {companies.map((name) => (
                <span key={name} className="text-sm font-semibold text-[var(--ds-text-secondary)]/40 hover:text-[var(--ds-text-secondary)]/70 transition-colors whitespace-nowrap">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 3. HOW IT WORKS ═══════════ */}
      <FeatureSteps />

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

      {/* ═══════════ 5. DEEP DIVE — ACCORDION ═══════════ */}
      <AccordionFeatures />

      {/* ═══════════ 6. FEATURE SHOWCASE - BaseHub grid pattern ═══════════ */}
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
              Whether you&apos;re running a campaign, shipping an app, or locking down your
              security stack &mdash; everything works from one place, and every link stays editable.
            </p>
          </motion.div>

          {/* Primary features - BaseHub 3-col grid with icon cards */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5 mb-6"
          >
            {[
              { icon: Globe2, title: "Custom domains", desc: "Your links look like they came from you, not a third-party tool. Bring your own domain for short links, bio pages, and QR codes.", plan: "Starter", featured: true },
              { icon: ChartLine, title: "Real-time analytics", desc: "See which campaign is working while you can still shift budget — not in yesterday's report. Device, location, and referrer breakdowns on every plan.", plan: "Free", featured: false },
              { icon: TestTubes, title: "A/B testing", desc: "Send half your traffic to one page, half to another. PivotURL tells you which one wins without you needing to do the math.", plan: "Starter", featured: false },
              { icon: Users, title: "Team collaboration", desc: "Give your team access without giving up control. Set who can create, edit, or delete links — and see a full history of every change.", plan: "Starter", featured: false },
              { icon: Shield, title: "Link safety scanning", desc: "Every link you publish gets scanned automatically. If a destination turns malicious after you share it, you get alerted.", plan: "Growth", featured: false },
              { icon: Smartphone, title: "Deep linking", desc: "Route mobile traffic straight into your app. Automatically configured — no code changes needed.", plan: "Starter", featured: false },
            ].map(({ icon: Icon, title, desc, plan, featured }) => (
              <motion.article
                key={title}
                variants={fadeUp}
                className={`group relative flex flex-col gap-4 rounded-lg border p-4 [box-shadow:_70px_-20px_130px_0px_rgba(255,255,255,0.05)_inset] transition-all duration-300 ${
                  featured
                    ? "border-[var(--ds-primary)]/20 hover:border-[var(--ds-primary)]/40"
                    : "border-[var(--ds-border)] hover:border-[var(--ds-primary)]/30"
                }`}
              >
                <figure className={`flex size-9 items-center justify-center rounded-full border p-2 ${
                  featured
                    ? "bg-[var(--ds-primary)] text-white border-[var(--ds-primary)]"
                    : "bg-[var(--ds-neutral-100)] text-[var(--ds-primary)] border-[var(--ds-border)]"
                }`}>
                  <Icon className="w-4 h-4" />
                </figure>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-lg font-medium">{title}</h5>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--ds-text-secondary)] bg-[var(--ds-neutral-100)] px-1.5 py-0.5 rounded">{plan}</span>
                  </div>
                  <p className="text-[var(--ds-text-secondary)] text-pretty">{desc}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {/* Advanced features - compact row */}
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
              { icon: KeyRound, title: "Enterprise security (SSO)" },
              { icon: Webhook, title: "Real-time webhooks" },
              { icon: Building2, title: "Custom SLA (99.99%)" },
              { icon: Lock, title: "Audit logs & access controls" },
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

      {/* ═══════════ 7. ANALYTICS SHOWCASE ═══════════ */}
      <section id="analytics" className="py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white">
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
                See which campaign is working while you can still shift budget &mdash;
                not in yesterday&apos;s report. Every click, scan, and view shows up the moment it happens.
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

      {/* ═══════════ 8. INTEGRATIONS & API ═══════════ */}
      <section className="py-20 sm:py-24 bg-[#F8FAFC] border-t border-[var(--ds-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <SectionLabel>Integrations</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Connect with your<br />
              <span className="text-[var(--ds-primary)]">favorite tools</span>
            </h2>
            <p className="mt-3 text-base text-[var(--ds-text-secondary)] max-w-lg mx-auto">
              Extend PivotURL, streamline workflows, and connect your favorite tools, with new integrations added constantly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Integrations grid */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-4"
            >
              {integrations.map(({ name, desc }) => (
                <motion.article
                  key={name}
                  variants={fadeUp}
                  className="flex flex-col gap-4 rounded-lg border border-[var(--ds-border)] bg-white p-4 [box-shadow:_70px_-20px_130px_0px_rgba(255,255,255,0.05)_inset] hover:border-[var(--ds-primary)]/30 transition-all duration-300"
                >
                  <figure className="flex size-9 items-center justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-neutral-100)] p-2">
                    <Globe2 className="w-4 h-4 text-[var(--ds-primary)]" />
                  </figure>
                  <div className="flex flex-col items-start gap-1">
                    <h5 className="text-lg font-medium">{name}</h5>
                    <p className="text-[var(--ds-text-secondary)] text-pretty">{desc}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            {/* API features */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-4"
            >
              {apiFeatures.map(({ icon: Icon, title, desc }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-xl border border-[var(--ds-border)] bg-white p-5 hover:border-[var(--ds-primary)]/20 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--ds-primary)]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--ds-primary)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-1">{title}</h4>
                    <p className="text-sm text-[var(--ds-text-secondary)]">{desc}</p>
                  </div>
                </motion.div>
              ))}

              <div className="pt-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ds-primary)] hover:gap-2 transition-all"
                >
                  Explore integrations <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ 9. PRICING - BaseHub card pattern ═══════════ */}
      <section id="pricing" className="py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white">
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
            className="flex flex-col gap-5 self-stretch lg:flex-row max-w-5xl mx-auto"
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

      {/* ═══════════ 10. FAQ - BaseHub accordion pattern ═══════════ */}
      <section className="py-20 sm:py-24 bg-[#F8FAFC] border-t border-[var(--ds-border)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-2"
          >
            {faqItems.map(({ question, answer }) => (
              <FaqItem key={question} question={question} answer={answer} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 11. TESTIMONIALS ═══════════ */}
      <section id="customers" className="py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white">
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
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 12. NEWSLETTER - BaseHub horizontal pattern ═══════════ */}
      <section className="bg-[var(--ds-neutral-100)] border-t border-[var(--ds-border)] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
            <div className="flex flex-1 flex-col items-start gap-1">
              <h5 className="text-xl font-medium lg:text-2xl">Stay ahead of the curve</h5>
              <p className="text-[var(--ds-text-secondary)] lg:text-lg">
                Join 10,000+ marketers for weekly insights on link optimization and attribution.
              </p>
            </div>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-10 px-4 rounded-full border border-[var(--ds-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-primary)]/50 focus:border-[var(--ds-primary)]"
              />
              <button className="h-10 px-6 rounded-full bg-[var(--ds-primary)] text-white text-sm font-semibold hover:bg-[var(--ds-primary-dark)] transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 13. FINAL CTA ═══════════ */}
      <section className="py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-[var(--ds-border)] bg-[#F8FAFC] px-8 py-16 sm:px-16 sm:py-20 text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)] mb-3">
              Start building links<br />that work for you
            </h2>
            <p className="text-base text-[var(--ds-text-secondary)] max-w-md mx-auto mb-8">
              Free to start. No credit card required. Edit anytime.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--ds-primary)] px-6 text-sm font-semibold text-white transition-all hover:bg-[var(--ds-primary-dark)] active:scale-[0.98]"
              >
                Get started <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--ds-border)] bg-white px-6 text-sm font-semibold text-[var(--ds-text-primary)] transition-all hover:border-[var(--ds-primary)]/30"
              >
                See more
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

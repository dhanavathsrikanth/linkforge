"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link2, Globe2, ChartLine, QrCode,
  Users, Shield, Zap, Code2,
} from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Hero } from "@/components/marketing/Hero";
import { Footer } from "@/components/marketing/Footer";

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ═══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex min-h-7 items-center justify-center gap-2 rounded-full bg-surface-secondary px-3.5 pb-px text-sm font-medium text-text-tertiary md:text-base">
      {children}
    </h3>
  );
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex max-w-[800px] flex-col justify-center gap-1 items-center self-center ${className}`}>
      <h4 className="text-pretty text-3xl font-medium md:text-4xl text-center">{children}</h4>
    </div>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={className}>
      <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

const companies = ["Vercel", "Product Hunt", "Raycast", "Cal.com", "Clerk", "Customer.io"];

const plans = [
  {
    name: "Free", price: "$0", period: "/mo", desc: "Start without a credit card",
    features: ["50 links per month", "1 bio page", "50 QR codes", "Real-time analytics", "UTM builder", "Password protection"],
    cta: "Start free",
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
];

const faqItems = [
  { q: "What is a link management platform?", a: "A link management platform lets you create, brand, track, and update short links at scale. Unlike basic URL shorteners, platforms like LinkForge provide real-time analytics, custom domains, QR codes, A/B testing, and team collaboration features." },
  { q: "How does LinkForge differ from Bitly and Dub?", a: "LinkForge combines the simplicity of Bitly with the attribution depth of Dub. We offer edit-anytime links (change destinations without breaking existing redirects), real-time conversion tracking, built-in affiliate programs, and transparent pricing." },
  { q: "Can I use my own custom domain?", a: "Yes! All paid plans include custom domain support. You can bring your own domain for short links, bio pages, and QR codes. Setup takes just a few minutes with automatic SSL and DNS verification." },
  { q: "How does the attribution tracking work?", a: "LinkForge tracks the entire customer journey from first click to final sale. We capture device, location, referrer, and UTM data in real-time, then match conversions back to the original link." },
  { q: "Is there an API for developers?", a: "Absolutely. We provide RESTful APIs with multi-language SDKs (TypeScript, Python, Go, Ruby, PHP), real-time webhooks, and comprehensive documentation. Our API handles millions of requests with 99.99% uptime." },
];

const testimonials = [
  { quote: "We've been so confident in LinkForge that we've used it for our public announcements. Incredibly reliable and robust — the edit-anytime feature saved us during a campaign pivot.", name: "Josh Pigford", role: "Founder", company: "Maybe Finance" },
  { quote: "Switching to LinkForge gave us access to the insights I've been looking for. Internal product launches, cohort analysis — growth increased by 200% in 2 weeks.", name: "Jason Lisch", role: "Head of Growth", company: "Product Hunt" },
  { quote: "LinkForge has been a game-changer for our marketing stack — not only providing source attribution, but bringing a suite of tools for our marketing and growth teams.", name: "Johnny Ho", role: "Co-founder", company: "Personality" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-primary text-text-primary antialiased">
      <Header />
      <Hero />

      {/* ═══════════ 1. COMPANIES ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative">
        <h2 className="text-center tracking-tight text-text-tertiary opacity-50">Join 4,000+ companies already growing</h2>
        <div className="no-scrollbar flex max-w-full justify-center overflow-auto">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-[30vw] bg-transparent bg-gradient-to-r from-surface-primary to-transparent z-10 xl:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-[30vw] bg-transparent bg-gradient-to-l from-surface-primary to-transparent z-10 xl:hidden" />
          <div className="flex shrink-0 items-center gap-6 px-12">
            {companies.map((name) => (
              <span key={name} className="text-lg font-semibold text-text-tertiary/40 hover:text-text-tertiary/70 transition-colors whitespace-nowrap">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 2. FEATURES — COMMUNICATION ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <div className="flex flex-col gap-3 items-center self-center">
          <SectionBadge>Link Management</SectionBadge>
          <SectionTitle>Streamlined Link Management</SectionTitle>
          <p className="max-w-2xl text-pretty text-lg font-light text-text-tertiary md:text-xl text-center">
            Simplify link creation, tracking, and updating with our efficient platform — enabling swift decisions and full control.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Card 1 */}
          <motion.article
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="group flex min-h-96 w-full flex-col rounded-xl border border-border bg-surface-secondary p-px md:flex-row md:odd:flex-row-reverse xl:gap-16 transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)]"
          >
            <figure className="p-2 md:h-auto md:w-[480px] xl:w-[560px]">
              <div className="relative aspect-video h-[200px] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-accent-50 via-accent-100/50 to-surface-secondary flex items-center justify-center md:h-full">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.08),transparent_70%)]" />
                <Link2 className="relative w-16 h-16 text-accent-400 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" strokeWidth={1} />
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-accent-200/60" />
                  <div className="h-1.5 w-1/3 rounded-full bg-accent-200/40" />
                  <div className="h-1.5 w-1/4 rounded-full bg-accent-200/30" />
                </div>
              </div>
            </figure>
            <div className="flex flex-col gap-8 p-5 pt-6 md:flex-1 md:p-10">
              <div className="flex flex-col items-start gap-2">
                <h5 className="text-2xl font-medium md:text-3xl">Edit-Anywhere Links</h5>
                <p className="font-normal text-text-secondary md:text-lg">
                  Change any destination after publishing — your redirects, embeds, and QR codes keep working. No dead links, no broken campaigns.
                </p>
              </div>
              <ul className="flex flex-col items-start gap-3 pl-2 md:text-lg">
                {["Change destinations live", "Zero broken redirects", "Full audit trail"].map((item) => (
                  <li key={item} className="flex items-center gap-4 font-normal text-text-secondary">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-100">
                      <CheckIcon className="text-accent-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>

          {/* Card 2 */}
          <motion.article
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="group flex min-h-96 w-full flex-col rounded-xl border border-border bg-surface-secondary p-px md:flex-row md:odd:flex-row-reverse xl:gap-16 transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)]"
          >
            <figure className="p-2 md:h-auto md:w-[480px] xl:w-[560px]">
              <div className="relative aspect-video h-[200px] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-accent-50 via-accent-100/50 to-surface-secondary flex items-center justify-center md:h-full">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.08),transparent_70%)]" />
                <ChartLine className="relative w-16 h-16 text-accent-400 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" strokeWidth={1} />
                <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 items-end">
                  {[40, 55, 35, 65, 50, 70, 60].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-accent-300/50" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </figure>
            <div className="flex flex-col gap-8 p-5 pt-6 md:flex-1 md:p-10">
              <div className="flex flex-col items-start gap-2">
                <h5 className="text-2xl font-medium md:text-3xl">Real-Time Analytics</h5>
                <p className="font-normal text-text-secondary md:text-lg">
                  See which campaign is working while you can still shift budget — not in yesterday&apos;s report. Every click shows up the moment it happens.
                </p>
              </div>
              <ul className="flex flex-col items-start gap-3 pl-2 md:text-lg">
                {["Live click tracking", "Device & location breakdown", "AI-powered insights"].map((item) => (
                  <li key={item} className="flex items-center gap-4 font-normal text-text-secondary">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-100">
                      <CheckIcon className="text-accent-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>

          {/* Card 3 */}
          <motion.article
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="group flex min-h-96 w-full flex-col rounded-xl border border-border bg-surface-secondary p-px md:flex-row md:odd:flex-row-reverse xl:gap-16 transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)]"
          >
            <figure className="p-2 md:h-auto md:w-[480px] xl:w-[560px]">
              <div className="relative aspect-video h-[200px] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-accent-50 via-accent-100/50 to-surface-secondary flex items-center justify-center md:h-full">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.08),transparent_70%)]" />
                <Shield className="relative w-16 h-16 text-accent-400 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" strokeWidth={1} />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  Protected
                </div>
              </div>
            </figure>
            <div className="flex flex-col gap-8 p-5 pt-6 md:flex-1 md:p-10">
              <div className="flex flex-col items-start gap-2">
                <h5 className="text-2xl font-medium md:text-3xl">Link Safety Scanning</h5>
                <p className="font-normal text-text-secondary md:text-lg">
                  Every link you publish gets scanned automatically. If a destination turns malicious after you share it, you get alerted instantly.
                </p>
              </div>
              <ul className="flex flex-col items-start gap-3 pl-2 md:text-lg">
                {["Cloudflare URL scanning", "Phishing & malware detection", "SOC 2 compliant"].map((item) => (
                  <li key={item} className="flex items-center gap-4 font-normal text-text-secondary">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-100">
                      <CheckIcon className="text-accent-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        </div>
      </section>

      {/* ═══════════ 3. FEATURES — GRID ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <div className="flex flex-col gap-3 items-center self-center">
          <SectionBadge>Platform</SectionBadge>
          <SectionTitle>Everything you need in one place</SectionTitle>
          <p className="max-w-2xl text-pretty text-lg font-light text-text-tertiary md:text-xl text-center">
            From brand to enterprise — one platform covers link shortening, bio pages, QR codes, analytics, and team collaboration.
          </p>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"
        >
          {[
            { icon: Globe2, title: "Custom Domains", desc: "Your links look like they came from you. Bring your own domain for short links, bio pages, and QR codes.", color: "from-blue-500/10 to-purple-500/10" },
            { icon: Link2, title: "Bio Pages", desc: "Build beautiful link-in-bio pages with drag-and-drop blocks. Swap themes and blocks without changing your URL.", color: "from-pink-500/10 to-orange-500/10" },
            { icon: QrCode, title: "Branded QR Codes", desc: "Generate QR codes with your brand colors and logo. Change the target URL without regenerating the code.", color: "from-green-500/10 to-teal-500/10" },
            { icon: ChartLine, title: "Real-Time Analytics", desc: "See every click, scan, and view the moment it happens. Device, location, and referrer breakdowns on every plan.", color: "from-violet-500/10 to-indigo-500/10" },
            { icon: Users, title: "Team Collaboration", desc: "Invite your team, control access with role-based permissions, and see a full history of every change.", color: "from-amber-500/10 to-yellow-500/10" },
            { icon: Zap, title: "A/B Testing", desc: "Split-test destinations from one short link. Our stats engine automatically determines the winner.", color: "from-red-500/10 to-pink-500/10" },
          ].map(({ icon: Icon, title, desc, color }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              className="group relative flex flex-col gap-4 rounded-xl border border-border p-5 transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)] [box-shadow:_70px_-20px_130px_0px_rgba(255,255,255,0.05)_inset]"
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <figure className="relative border-border bg-surface-secondary flex size-10 items-center justify-center rounded-xl border p-2 transition-all duration-300 group-hover:bg-accent-100 group-hover:border-accent-200">
                <Icon className="w-5 h-5 text-accent-500 transition-transform duration-300 group-hover:scale-110" />
              </figure>
              <div className="relative flex flex-col items-start gap-1.5">
                <h5 className="text-lg font-medium">{title}</h5>
                <p className="text-text-secondary text-pretty text-sm leading-relaxed">{desc}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <div className="flex items-center justify-center gap-3">
          <Link href="/sign-up" className="group inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-accent-500 text-sm font-medium text-white hover:bg-accent-600 transition-all duration-200 shadow-[0_0_16px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]">
            Get started
          </Link>
          <Link href="#features" className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border bg-surface-secondary text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-colors">
            See more
          </Link>
        </div>
      </section>

      {/* ═══════════ 4. CALLOUT ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <motion.article
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative overflow-hidden flex flex-col justify-center gap-9 self-stretch rounded-2xl p-8 lg:flex-row lg:justify-between lg:p-12 border border-accent-200 bg-gradient-to-br from-accent-50 via-white to-accent-50/50"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-200/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-300/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 flex flex-col gap-3">
            <h4 className="text-3xl font-medium lg:text-4xl">Supercharge your marketing with LinkForge</h4>
            <p className="text-text-secondary text-lg lg:text-xl">Edit links live, track every click, and collaborate without the chaos.</p>
          </div>
          <div className="relative z-10 grid grid-cols-2 items-center gap-2 md:flex lg:flex-col">
            <Link href="/sign-up" className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-600 transition-all duration-200 shadow-[0_0_16px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]">
              Get started
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center rounded-full border border-border bg-surface-secondary/80 backdrop-blur-sm px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-colors">
              See more
            </Link>
          </div>
        </motion.article>
      </section>

      {/* ═══════════ 5. BIG IMAGE FEATURE ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative rounded-2xl border border-border bg-gradient-to-br from-surface-secondary to-surface-primary w-full aspect-[2/1] flex items-center justify-center overflow-hidden"
        >
          {/* Dashboard mockup */}
          <div className="absolute inset-4 rounded-xl border border-border bg-surface-primary p-4 shadow-xl overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400/60" />
                <div className="size-3 rounded-full bg-yellow-400/60" />
                <div className="size-3 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 h-6 rounded-md bg-surface-secondary" />
            </div>
            {/* Content grid */}
            <div className="grid grid-cols-4 gap-3 h-[calc(100%-44px)]">
              <div className="col-span-1 rounded-lg border border-border bg-surface-secondary p-3 flex flex-col gap-2">
                <div className="h-3 w-16 rounded bg-accent-200/60" />
                <div className="h-2 w-20 rounded bg-surface-tertiary" />
                <div className="h-2 w-14 rounded bg-surface-tertiary" />
                <div className="mt-auto h-2 w-12 rounded bg-accent-200/40" />
              </div>
              <div className="col-span-3 rounded-lg border border-border bg-surface-secondary p-3 flex flex-col gap-2">
                <div className="flex gap-4 mb-2">
                  <div className="h-8 w-24 rounded-md bg-accent-100 border border-accent-200 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-accent-600">12,847 clicks</span>
                  </div>
                  <div className="h-8 w-20 rounded-md bg-surface-tertiary flex items-center justify-center">
                    <span className="text-[10px] text-text-tertiary">3,291 views</span>
                  </div>
                  <div className="h-8 w-20 rounded-md bg-surface-tertiary flex items-center justify-center">
                    <span className="text-[10px] text-text-tertiary">1,024 QR</span>
                  </div>
                </div>
                <div className="flex-1 rounded-md bg-surface-tertiary/50 p-2 flex items-end gap-1">
                  {[30, 45, 35, 60, 50, 75, 55, 80, 65, 90, 70, 85].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-accent-300/60 transition-all" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-primary via-transparent to-transparent" />
        </motion.div>

        <div className="flex flex-col gap-3 items-center self-center">
          <SectionBadge>Analytics</SectionBadge>
          <SectionTitle>Know every click, every scan, every view</SectionTitle>
          <p className="max-w-2xl text-pretty text-lg font-light text-text-tertiary md:text-xl text-center">
            See which campaign is working while you can still shift budget — not in yesterday&apos;s report.
          </p>
        </div>

        <div className="flex w-full flex-col items-start gap-6 md:grid md:grid-cols-3 md:gap-16">
          {[
            { icon: Link2, title: "Real-Time Tracking", desc: "Every click and scan shows up the moment it happens. No more waiting for daily reports." },
            { icon: Globe2, title: "Geo & Device Data", desc: "See exactly where your traffic comes from — country, city, device, browser, and OS." },
            { icon: ChartLine, title: "AI-Powered Insights", desc: "Automatic anomaly detection and trend analysis help you spot opportunities faster." },
          ].map(({ icon: Icon, title, desc }) => (
            <article key={title} className="group flex flex-col gap-4">
              <figure className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-secondary p-2.5 transition-all duration-300 group-hover:bg-accent-100 group-hover:border-accent-200">
                <Icon className="w-5 h-5 text-accent-500 transition-transform duration-300 group-hover:scale-110" />
              </figure>
              <div className="flex flex-col items-start gap-1.5">
                <h5 className="text-lg font-medium">{title}</h5>
                <p className="text-text-tertiary leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════ 6. SIDE-BY-SIDE FEATURES ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative lg:container lg:mx-auto lg:flex-row lg:gap-0 lg:p-28">
        <div className="relative top-0 container mx-auto shrink self-stretch px-6 lg:w-1/2 lg:pr-12 lg:pl-0 xl:pr-20">
          <div className="sticky top-24 bottom-0 flex flex-col gap-10">
            <div className="flex flex-col gap-3 items-start self-start">
              <SectionBadge>Productivity</SectionBadge>
              <SectionTitle className="items-start">
                <span className="text-left">Supercharge Team Productivity</span>
              </SectionTitle>
              <p className="max-w-md text-pretty text-lg font-light text-text-tertiary md:text-xl text-left">
                Keep your team focused and productive as they collaborate on building and shipping campaigns swiftly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/sign-up" className="group inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-accent-500 text-sm font-medium text-white hover:bg-accent-600 transition-all duration-200 shadow-[0_0_16px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]">
                Get started
              </Link>
              <Link href="#features" className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border bg-surface-secondary text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-colors">
                See more
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full flex-1 shrink-0 lg:w-1/2 lg:flex-1">
          <div className="no-scrollbar flex gap-4 overflow-auto px-6 lg:flex-col lg:px-0 lg:gap-4">
            {[
              { icon: Link2, title: "Custom Domains", desc: "Your branded short links, bio pages, and QR codes all use your own domain for professional trust." },
              { icon: Globe2, title: "Deep Linking", desc: "Route mobile traffic straight into your app. Universal Links and App Links auto-configured." },
              { icon: ChartLine, title: "UTM Builder", desc: "Automatically append UTM parameters to every link. Full campaign attribution without the hassle." },
              { icon: Zap, title: "Bulk Operations", desc: "Create, update, and manage thousands of links at once. Import from CSV or use the API." },
              { icon: Shield, title: "Enterprise Security", desc: "SOC 2 compliant, SAML SSO, audit logs, and role-based access control for your entire team." },
              { icon: Code2, title: "Developer API", desc: "RESTful API with multi-language SDKs. Webhooks, rate limiting, and 99.99% uptime SLA." },
            ].map(({ icon: Icon, title, desc }) => (
              <article key={title} className="group border-border bg-surface-secondary flex w-[280px] shrink-0 flex-col gap-4 rounded-xl border p-5 transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)] lg:w-full lg:flex-row lg:p-6">
                <figure className="bg-surface-tertiary flex size-12 shrink-0 items-center justify-center rounded-xl p-3 transition-all duration-300 group-hover:bg-accent-100 group-hover:border-accent-200">
                  <Icon className="w-5 h-5 text-accent-500 transition-transform duration-300 group-hover:scale-110" />
                </figure>
                <div className="flex flex-col items-start gap-1.5">
                  <h5 className="text-lg font-medium">{title}</h5>
                  <p className="text-text-tertiary text-pretty text-sm leading-relaxed">{desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 7. CALLOUT 2 ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <motion.article
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="border-border bg-surface-secondary relative flex flex-col items-center justify-center gap-9 self-stretch overflow-hidden rounded-2xl border p-8 md:p-12"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 via-transparent to-accent-500/5" />
          <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-accent-300/40 to-transparent" />
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-accent-300/40 to-transparent" />
          <div className="relative z-20 flex flex-col items-center gap-3 text-center">
            <h4 className="text-center text-3xl font-medium tracking-tighter md:text-4xl">Start building links that work for you</h4>
            <p className="text-text-secondary text-lg md:text-xl">Free to start. No credit card required. Edit anytime.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <Link href="/sign-up" className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-600 transition-all duration-200 shadow-[0_0_16px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]">
              Get started
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center rounded-full border border-border bg-surface-secondary/80 backdrop-blur-sm px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-colors">
              See more
            </Link>
          </div>
        </motion.article>
      </section>

      {/* ═══════════ 8. TESTIMONIALS ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <div className="flex flex-col gap-3 items-start self-start">
          <SectionTitle className="items-start">
            <span className="text-left">What our clients say</span>
          </SectionTitle>
        </div>

        <div className="relative flex w-full gap-6 md:gap-0 overflow-hidden">
          {testimonials.map((t, i) => (
            <motion.article
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="min-w-0 max-w-full shrink-0 grow-0 basis-[min(740px,100%)] self-stretch md:pr-6"
            >
              <div className="group flex h-full flex-col rounded-2xl border border-border bg-surface-secondary transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)]">
                <div className="flex flex-1 items-start border-b border-border px-6 py-6 md:px-8 md:py-8">
                  <blockquote className="text-pretty text-xl font-extralight leading-[1.35] sm:text-2xl md:text-3xl">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>
                <div className="flex items-center gap-4 px-6 py-5 md:px-8">
                  <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-accent-100 to-accent-200 text-lg font-medium text-accent-700">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <h5 className="text-base font-medium md:text-lg">{t.name}</h5>
                    <p className="text-sm text-text-tertiary md:text-base">{t.role}, {t.company}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <svg key={j} className="size-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-text-tertiary">{t.company}</span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ═══════════ 9. PRICING ═══════════ */}
      <section id="pricing" className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6 xl:max-w-6xl">
        <div className="flex flex-col gap-3 items-center self-center">
          <SectionBadge>Pricing</SectionBadge>
          <SectionTitle>Simple pricing for your team</SectionTitle>
          <p className="max-w-md text-pretty text-lg font-light text-text-tertiary md:text-xl text-center">
            No hidden fees, no surprises. All plans include real-time analytics.
          </p>
        </div>

        <div className="flex flex-col gap-5 self-stretch lg:flex-row">
          {plans.map((plan) => (
            <motion.article
              key={plan.name}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className={`relative flex flex-1 flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
                plan.highlighted
                  ? "border-accent-300 shadow-[0_0_40px_-12px_rgba(124,58,237,0.2)] bg-gradient-to-b from-accent-50/50 to-surface-secondary"
                  : "border-border hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.12)]"
              }`}
            >
              {plan.badge && (
                <span className="bg-accent-500 absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-3 py-0.5 text-center text-xs font-medium text-white lg:text-sm shadow-[0_0_12px_rgba(124,58,237,0.3)]">
                  {plan.badge}
                </span>
              )}
              <header className="flex flex-col gap-4 px-8 pb-0 pt-10">
                <span className="text-center text-3xl font-medium lg:text-4xl">
                  {plan.price}{plan.period && <span className="text-sm text-text-tertiary">{plan.period}</span>}
                </span>
                <div className="flex flex-col">
                  <h5 className="text-center text-lg font-medium lg:text-xl">{plan.name}</h5>
                  <p className="text-center text-sm text-text-tertiary lg:text-base">{plan.desc}</p>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-6 p-6 pb-12 lg:p-8">
                <ul className="flex flex-col gap-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-text-secondary lg:text-base">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 lg:size-5 text-accent-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <footer className="relative flex w-full items-center self-stretch p-8 pt-0">
                <Link
                  href="/sign-up"
                  className={`z-10 w-full inline-flex items-center justify-center h-11 px-5 text-sm md:text-base rounded-full font-medium transition-all duration-200 ${
                    plan.highlighted
                      ? "bg-accent-500 text-white hover:bg-accent-600 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_28px_rgba(124,58,237,0.4)]"
                      : "bg-surface-secondary text-text-primary border border-border hover:bg-surface-tertiary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </footer>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ═══════════ 10. FAQ ═══════════ */}
      <section className="py-14 md:py-[72px] flex flex-col items-center gap-10 relative container mx-auto px-6">
        <div className="flex flex-col gap-3 items-center self-center">
          <SectionBadge>FAQs</SectionBadge>
          <SectionTitle>Frequently asked questions</SectionTitle>
          <p className="max-w-md text-pretty text-lg font-light text-text-tertiary md:text-xl text-center">
            Advice and answers from our team.
          </p>
        </div>

        <ul className="mx-auto flex w-full flex-col place-content-start items-start gap-6 self-stretch lg:grid lg:grid-cols-3 lg:gap-8 lg:px-12">
          {faqItems.map(({ q, a }) => (
            <li key={q} className="group flex flex-col gap-2 rounded-xl border border-border bg-surface-secondary p-5 transition-all duration-300 hover:border-accent-200 hover:shadow-[0_8px_40px_-12px_rgba(124,58,237,0.08)]">
              <p className="leading-relaxed font-medium tracking-tight sm:text-lg">{q}</p>
              <p className="text-text-tertiary text-sm leading-relaxed tracking-tight sm:text-base">{a}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══════════ 11. NEWSLETTER ═══════════ */}
      <section className="bg-surface-secondary py-12 border-y border-border">
        <div className="container mx-auto flex flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col items-start gap-1.5">
            <h5 className="text-xl font-medium lg:text-2xl">Stay ahead of the curve</h5>
            <p className="text-text-tertiary lg:text-lg">Join 10,000+ marketers for weekly insights on link optimization.</p>
          </div>
          <form className="flex gap-2.5">
            <input
              type="email"
              required
              placeholder="john@gmail.com"
              className="h-11 w-full max-w-xs rounded-full border border-border bg-surface-primary px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-300 transition-all"
            />
            <button
              type="submit"
              className="h-11 px-6 rounded-full bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-all duration-200 shadow-[0_0_16px_rgba(124,58,237,0.25)] hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}

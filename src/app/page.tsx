import Link from "next/link";
import { 
  BarChart3, 
  Globe, 
  Zap, 
  ShieldCheck, 
  QrCode, 
  Smartphone, 
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-[#09090b] text-white selection:bg-violet-500/30 selection:text-white">
      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">LinkForge</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {["Features", "Pricing", "Enterprise", "Resources"].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link 
              href="/signup" 
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-16">
        {/* ─── Hero Section ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-24 pb-32 sm:pt-32 lg:pb-48">
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 z-0">
            <div className="absolute -top-24 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 right-0 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5 text-xs font-semibold text-violet-400 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-1000">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Link Management</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </div>
            </div>

            <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[1.1] tracking-tight sm:text-7xl lg:text-8xl">
              Power your links. <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Control your growth.
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 sm:text-xl">
              LinkForge transforms your URLs into powerful marketing assets. 
              Branded links, deep tracking, and real-time insights for world-class teams.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-violet-600 px-8 text-base font-bold text-white shadow-xl shadow-violet-600/20 transition-all hover:bg-violet-700 hover:shadow-violet-600/40 active:scale-95 sm:w-auto"
              >
                Create your first link
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#pricing"
                className="flex h-14 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 text-base font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 sm:w-auto"
              >
                View Plans
              </Link>
            </div>

            {/* Dashboard Mockup Preview */}
            <div className="mt-20 relative px-4 lg:px-0">
              <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#09090b] p-2 shadow-2xl shadow-black">
                <div className="overflow-hidden rounded-xl border border-white/5 bg-[#141418]">
                  <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/50 px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/40" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                      <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/40" />
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-1 text-[10px] text-zinc-500 border border-white/5">
                      <Globe className="h-3 w-3" />
                      linkforge.app/dashboard/analytics
                    </div>
                    <div className="w-12" />
                  </div>
                  <div className="aspect-[16/9] bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center grayscale opacity-40 mix-blend-luminosity" />
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -left-4 top-1/4 hidden lg:block animate-bounce duration-[3000ms]">
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Total Clicks</p>
                      <p className="text-xl font-bold text-white">124,892</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 bottom-1/4 hidden lg:block animate-bounce duration-[4000ms]">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Globe className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Global Reach</p>
                      <p className="text-xl font-bold text-white">142 Countries</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Trust Bar ───────────────────────────────────────────────────── */}
        <section className="border-y border-white/5 bg-white/[0.02] py-12">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-center text-sm font-medium uppercase tracking-widest text-zinc-500">
              Trusted by scaling startups and industry leaders
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 grayscale opacity-40">
              {["Stripe", "Airbnb", "Vercel", "GitHub", "Notion", "Linear"].map((name) => (
                <span key={name} className="text-2xl font-bold tracking-tighter text-white">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features Grid ───────────────────────────────────────────────── */}
        <section id="features" className="py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-20 max-w-2xl">
              <h2 className="text-3xl font-bold text-white sm:text-5xl">
                Everything you need to <br />
                <span className="text-zinc-500">scale your digital presence.</span>
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Globe className="h-6 w-6" />,
                  title: "Custom Domains",
                  desc: "Connect your own domains and subdomains for a fully branded link experience.",
                  color: "blue"
                },
                {
                  icon: <BarChart3 className="h-6 w-6" />,
                  title: "Advanced Analytics",
                  desc: "Detailed insights into clicks, locations, devices, and referrers in real-time.",
                  color: "violet"
                },
                {
                  icon: <ShieldCheck className="h-6 w-6" />,
                  title: "Access Control",
                  desc: "Protect links with passwords and set expiration dates for ultimate security.",
                  color: "green"
                },
                {
                  icon: <QrCode className="h-6 w-6" />,
                  title: "Smart QR Codes",
                  desc: "Generate dynamic QR codes that you can update even after printing.",
                  color: "orange"
                },
                {
                  icon: <Smartphone className="h-6 w-6" />,
                  title: "App Deep Links",
                  desc: "Route mobile users directly into your iOS or Android app seamlessly.",
                  color: "purple"
                },
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "Edge Delivery",
                  desc: "Powered by Cloudflare Workers for ultra-fast, sub-50ms global redirects.",
                  color: "red"
                }
              ].map((feature, i) => (
                <div 
                  key={feature.title}
                  className="group relative rounded-2xl border border-white/5 bg-[#141418] p-8 transition-all hover:border-white/10 hover:bg-zinc-900"
                >
                  <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-zinc-300 transition-colors group-hover:text-white`}>
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-white">{feature.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing Section ─────────────────────────────────────────────── */}
        <section id="pricing" className="relative py-32 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-20 text-center">
              <h2 className="text-4xl font-bold text-white sm:text-6xl">Simple, tiered pricing.</h2>
              <p className="mt-6 text-lg text-zinc-400">Scale without complexity. Choose the plan that fits your growth.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  name: "Free",
                  price: "$0",
                  desc: "For individuals and small side projects.",
                  features: ["Up to 100 links", "Standard analytics", "LinkForge domain", "QR codes"],
                  cta: "Get Started",
                  popular: false
                },
                {
                  name: "Pro",
                  price: "$29",
                  desc: "For growing teams and creators.",
                  features: ["Unlimited links", "Custom domains", "Advanced analytics", "Password protection", "API access"],
                  cta: "Go Pro",
                  popular: true
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  desc: "For large organizations with complex needs.",
                  features: ["SAML SSO", "SLA guarantees", "Dedicated support", "White-label reports", "Multi-workspace"],
                  cta: "Contact Sales",
                  popular: false
                }
              ].map((plan) => (
                <div 
                  key={plan.name}
                  className={`relative flex flex-col rounded-3xl border p-8 transition-all ${
                    plan.popular 
                    ? "border-violet-500 bg-violet-500/5 shadow-2xl shadow-violet-500/20 ring-1 ring-violet-500" 
                    : "border-white/10 bg-[#141418] hover:border-white/20"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-zinc-500 text-sm">/mo</span>}
                  </div>
                  <p className="mt-4 text-sm text-zinc-400">{plan.desc}</p>
                  
                  <ul className="mt-8 flex-1 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                        <Check className="h-4 w-4 text-violet-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button className={`mt-10 w-full rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                    plan.popular 
                    ? "bg-white text-black hover:bg-zinc-200" 
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                  }`}>
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Footer ──────────────────────────────────────────────────── */}
        <section className="py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 to-violet-700 px-8 py-20 text-center shadow-2xl shadow-violet-600/20">
              {/* Pattern Overlay */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              
              <div className="relative z-10 mx-auto max-w-2xl">
                <h2 className="text-4xl font-bold text-white sm:text-6xl">Ready to shorten?</h2>
                <p className="mt-6 text-lg text-white/80">Join 50,000+ teams creating smarter links today. No credit card required.</p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link 
                    href="/signup" 
                    className="flex h-14 w-full items-center justify-center rounded-xl bg-white px-8 text-base font-bold text-black transition-all hover:bg-zinc-200 sm:w-auto"
                  >
                    Get Started Free
                  </Link>
                  <Link 
                    href="/enterprise" 
                    className="flex h-14 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 sm:w-auto"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 bg-black py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-4">
              <div className="col-span-1 lg:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white">LinkForge</span>
                </div>
                <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                  The infrastructure for world-class link management. 
                  Faster, smarter, and more reliable redirects for your digital marketing.
                </p>
              </div>

              {[
                { title: "Product", links: ["Features", "Pricing", "Enterprise", "Changelog"] },
                { title: "Resources", links: ["Docs", "API", "Blog", "Status"] },
                { title: "Company", links: ["About", "Careers", "Legal", "Privacy"] }
              ].map((group) => (
                <div key={group.title}>
                  <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-zinc-300">{group.title}</h4>
                  <ul className="space-y-4">
                    {group.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 sm:flex-row">
              <p className="text-xs text-zinc-600">
                © 2026 LinkForge Inc. All rights reserved.
              </p>
              <div className="flex gap-6">
                <a href="#" className="text-zinc-600 hover:text-white transition-colors"><span className="sr-only">Twitter</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></a>
                <a href="#" className="text-zinc-600 hover:text-white transition-colors"><span className="sr-only">GitHub</span><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.008.069-.008 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg></a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

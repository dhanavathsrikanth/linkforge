"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2, ChartLine, TestTubes, Users, Shield, Smartphone,
  CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AccordionFeature {
  id: string;
  icon: React.ElementType;
  title: string;
  short: string;
  description: string;
  details: string[];
  plan: string;
  color: string;
}

const features: AccordionFeature[] = [
  {
    id: "custom-domains",
    icon: Globe2,
    title: "Custom domains",
    short: "Brand your links with your own domain",
    description:
      "Use your own domain for short links, bio pages, and QR codes. Professional branding in seconds — no complex DNS setup required.",
    details: [
      "Auto-configure with your domain provider",
      "SSL/TLS certificates managed automatically",
      "Works for short links, bio pages, and QR codes",
      "Multiple domains per workspace",
    ],
    plan: "Starter",
    color: "from-blue-500/20 to-indigo-500/10",
  },
  {
    id: "analytics",
    icon: ChartLine,
    title: "Real-time analytics",
    short: "Know every click the moment it happens",
    description:
      "Device, location, referrer, and browser data updated in real time. AI-powered anomaly detection flags unusual patterns before they become problems.",
    details: [
      "Live click counter with geographic heatmap",
      "Device, browser, OS breakdown",
      "AI-powered insight generation",
      "Export to CSV or connect via API",
    ],
    plan: "Free",
    color: "from-emerald-500/20 to-teal-500/10",
  },
  {
    id: "ab-testing",
    icon: TestTubes,
    title: "A/B testing",
    short: "Split-test destinations from one short link",
    description:
      "Route traffic to up to 4 different destinations from a single short link. Our Bayesian stats engine automatically determines the winner with statistical confidence.",
    details: [
      "Up to 4 variants per link",
      "Traffic split: even or weighted",
      "Bayesian statistical analysis",
      "Auto-promote winner or manual control",
    ],
    plan: "Starter",
    color: "from-amber-500/20 to-orange-500/10",
  },
  {
    id: "team",
    icon: Users,
    title: "Team collaboration",
    short: "Invite your team, control access",
    description:
      "Role-based access controls, shared link workspaces, audit logs, and real-time collaboration. Your whole team works from one place.",
    details: [
      "Role-based access: admin, member, viewer",
      "Shared link libraries and folders",
      "Full audit trail for compliance",
      "Real-time activity feed",
    ],
    plan: "Starter",
    color: "from-violet-500/20 to-purple-500/10",
  },
  {
    id: "deep-linking",
    icon: Smartphone,
    title: "Deep linking",
    short: "Send mobile traffic straight into your app",
    description:
      "Universal Links (iOS) and App Links (Android) auto-configured. Route users to your app when installed, with intelligent app store fallback when not.",
    details: [
      "Universal Links & Android App Links",
      "App store fallback with deferred deep linking",
      "Apple App Site Association files auto-generated",
      "AssetLinks.json auto-generated",
    ],
    plan: "Starter",
    color: "from-cyan-500/20 to-sky-500/10",
  },
  {
    id: "safety",
    icon: Shield,
    title: "Link safety scanning",
    short: "Automated protection against malicious links",
    description:
      "Cloudflare URL Scanner checks every link in real time. Trust scores, phishing alerts, and abuse reporting keep your brand safe.",
    details: [
      "Real-time URL scanning via Cloudflare",
      "Phishing and malware detection",
      "Trust score per link",
      "Automated abuse reporting workflow",
    ],
    plan: "Growth",
    color: "from-rose-500/20 to-pink-500/10",
  },
];

export function AccordionFeatures() {
  const [activeId, setActiveId] = useState(features[0].id);
  const active = features.find((f) => f.id === activeId) ?? features[0];

  return (
    <section className="relative py-20 sm:py-24 border-t border-[var(--ds-border)] bg-white overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-[var(--ds-primary)]/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ds-primary)]/10 text-[var(--ds-primary)] text-xs font-semibold mb-4">
            <Sparkles className="w-3 h-3" />
            Deep dive
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)]">
            Explore every feature
          </h2>
          <p className="mt-3 text-base text-[var(--ds-text-secondary)] max-w-lg mx-auto">
            Click through each feature to see how it works and what it unlocks.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Accordion panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full"
          >
            <Accordion
              type="single"
              value={activeId}
              onValueChange={(v) => v && setActiveId(v)}
              className="w-full"
            >
              {features.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="group">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-lg bg-[var(--ds-primary)]/10 flex items-center justify-center shrink-0 group-data-[state=open]:bg-[var(--ds-primary)] group-data-[state=open]:text-white transition-all duration-200">
                        <f.icon className="w-4 h-4 text-[var(--ds-primary)] group-data-[state=open]:text-white transition-colors" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[var(--ds-text-primary)] group-data-[state=open]:text-[var(--ds-primary)] transition-colors">
                          {f.title}
                        </span>
                        <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">{f.short}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-11 pr-4">
                      <p className="text-sm text-[var(--ds-text-secondary)] leading-relaxed mb-3">
                        {f.description}
                      </p>
                      <ul className="space-y-1.5 mb-4">
                        {f.details.map((d) => (
                          <li key={d} className="flex items-start gap-2 text-xs text-[var(--ds-text-secondary)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ds-accent)] mt-0.5 shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                      <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-[var(--ds-text-secondary)] bg-[var(--ds-border)] px-1.5 py-0.5 rounded">
                        {f.plan}
                      </span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Detail panel — changes with active feature */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden lg:block sticky top-24"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-[var(--ds-border)] bg-white overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <div className={`h-40 bg-gradient-to-br ${active.color} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent_70%)]" />
                  <active.icon className="w-16 h-16 text-[var(--ds-primary)] relative z-10" strokeWidth={1.5} />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[var(--ds-text-primary)]">{active.title}</h3>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--ds-text-secondary)] bg-[var(--ds-border)] px-1.5 py-0.5 rounded">{active.plan}</span>
                  </div>
                  <p className="text-sm text-[var(--ds-text-secondary)] leading-relaxed mb-4">{active.description}</p>
                  <ul className="space-y-2 mb-5">
                    {active.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-[var(--ds-text-secondary)]">
                        <CheckCircle2 className="w-4 h-4 text-[var(--ds-accent)] mt-0.5 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ds-primary)] hover:gap-2 transition-all"
                  >
                    Try it free <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

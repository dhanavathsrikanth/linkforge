"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link2, Globe2, ChartLine, RefreshCw,
  CheckCircle2, ArrowRight, QrCode, Layers,
  Smartphone, Sparkles,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const steps = [
  {
    icon: Link2,
    title: "Create",
    desc: "Shorten a long URL or build a bio page in one click. Add custom slugs, UTM tags, and password protection — all in seconds.",
    details: [
      "AI-powered slug suggestions",
      "Custom slugs & UTM builder",
      "Password protection",
      "Bulk link creation",
    ],
    accent: "from-blue-500/20 to-indigo-500/10",
    illustration: "create",
  },
  {
    icon: Globe2,
    title: "Share",
    desc: "Deploy across social, email, SMS, and print. Generate QR codes that match your brand colors and logo.",
    details: [
      "Social, email, SMS, and print",
      "Branded QR codes",
      "Deep linking for mobile apps",
      "Custom domains",
    ],
    accent: "from-emerald-500/20 to-teal-500/10",
    illustration: "share",
  },
  {
    icon: ChartLine,
    title: "Track",
    desc: "Real-time analytics on clicks, scans, devices, locations, and referrers. AI-powered insights spot every trend.",
    details: [
      "Live click counter",
      "Device & location breakdown",
      "AI-powered anomaly detection",
      "Export to CSV or API",
    ],
    accent: "from-amber-500/20 to-orange-500/10",
    illustration: "track",
  },
  {
    icon: RefreshCw,
    title: "Update",
    desc: "Change any destination, swap bio blocks, or retarget a QR code. Every published link, page, and code keeps working.",
    details: [
      "Edit without breaking redirects",
      "Swap bio blocks & themes",
      "Retarget QR codes live",
      "Full audit trail",
    ],
    accent: "from-purple-500/20 to-pink-500/10",
    illustration: "update",
  },
];

function CreateIllustration() {
  return (
    <div className="w-full max-w-xs space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--ds-border)] bg-white px-3 py-2.5 shadow-sm">
        <Link2 className="w-4 h-4 text-[var(--ds-text-secondary)]/50 shrink-0" />
        <span className="text-xs text-[var(--ds-text-secondary)]/40 truncate">pivoturl.com/sale2025</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl border border-[var(--ds-primary)]/30 bg-[var(--ds-primary)]/5 px-3 py-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--ds-primary)]" />
          <span className="text-xs font-medium text-[var(--ds-primary)]">sale2025</span>
        </div>
        <div className="rounded-xl border border-[var(--ds-border)] bg-white px-3 py-2">
          <span className="text-xs text-[var(--ds-text-secondary)]">UTM</span>
        </div>
      </div>
      <div className="rounded-xl border border-[var(--ds-border)] bg-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--ds-primary)]/10 flex items-center justify-center">
            <QrCode className="w-3.5 h-3.5 text-[var(--ds-primary)]" />
          </div>
          <span className="text-xs font-medium text-[var(--ds-text-primary)]">QR Code</span>
        </div>
        <CheckCircle2 className="w-4 h-4 text-[var(--ds-accent)]" />
      </div>
    </div>
  );
}

function ShareIllustration() {
  return (
    <div className="w-full max-w-xs">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Twitter", color: "bg-sky-50 text-sky-600 border-sky-100" },
          { label: "Email", color: "bg-amber-50 text-amber-600 border-amber-100" },
          { label: "SMS", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
          { label: "Print", color: "bg-purple-50 text-purple-600 border-purple-100" },
        ].map(({ label, color }) => (
          <div
            key={label}
            className={`rounded-xl border ${color} p-3 flex items-center gap-2`}
          >
            <div className="w-5 h-5 rounded-md bg-white/80 flex items-center justify-center">
              <Globe2 className="w-3 h-3" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-[var(--ds-border)] bg-white p-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-[var(--ds-primary)]/10 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-[var(--ds-primary)]" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--ds-text-primary)]">Branded QR</p>
          <p className="text-[10px] text-[var(--ds-text-secondary)]">Custom colors & logo</p>
        </div>
      </div>
    </div>
  );
}

function TrackIllustration() {
  return (
    <div className="w-full max-w-xs space-y-3">
      <div className="rounded-xl border border-[var(--ds-border)] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider">Today</span>
          <span className="text-lg font-bold text-[var(--ds-accent)]">1,247</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-[var(--ds-primary)]/20"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Devices", value: "62%" },
          { label: "Mobile", value: "38%" },
          { label: "Desktop", value: "38%" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[var(--ds-border)] bg-white p-2 text-center">
            <p className="text-xs font-bold text-[var(--ds-text-primary)]">{value}</p>
            <p className="text-[10px] text-[var(--ds-text-secondary)]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpdateIllustration() {
  return (
    <div className="w-full max-w-xs space-y-3">
      <div className="rounded-xl border border-[var(--ds-border)] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wider">Live redirect</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[var(--ds-text-secondary)]">
            <span className="line-through">pivoturl.com/sale2024</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-[var(--ds-primary)]" />
            <span className="text-xs font-semibold text-[var(--ds-primary)]">pivoturl.com/sale2025</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl border border-[var(--ds-border)] bg-white p-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--ds-primary)]" />
          <div>
            <p className="text-[10px] font-semibold text-[var(--ds-text-primary)]">Bio block</p>
            <p className="text-[10px] text-[var(--ds-text-secondary)]">Swapped</p>
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-[var(--ds-border)] bg-white p-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[var(--ds-primary)]" />
          <div>
            <p className="text-[10px] font-semibold text-[var(--ds-text-primary)]">QR target</p>
            <p className="text-[10px] text-[var(--ds-text-secondary)]">Updated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const illustrations: Record<string, React.FC> = {
  create: CreateIllustration,
  share: ShareIllustration,
  track: TrackIllustration,
  update: UpdateIllustration,
};

export function FeatureSteps() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-24 border-t border-[var(--ds-border)] bg-[#F8FAFC] overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 text-xs font-medium text-[var(--ds-text-secondary)] bg-[var(--ds-border)]/50 rounded-full mb-4 border border-[var(--ds-border)]">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ds-text-primary)] mb-4">
            Enhanced Link Management
          </h2>
          <p className="max-w-2xl mx-auto text-[var(--ds-text-secondary)] text-sm md:text-base leading-relaxed">
            Simplify link creation, sharing, tracking, and updating with our efficient platform — enabling swift decisions and full control over every link.
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map((step, i) => {
            const Illustration = illustrations[step.illustration];
            const isReversed = i % 2 === 1;
            return (
              <motion.section
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="feature-card rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-12"
                style={{
                  backgroundColor: "var(--ds-secondary, #f9fafb)",
                  border: "1px solid var(--ds-border)",
                }}
              >
                <div className={`w-full md:w-1/2 ${isReversed ? "md:order-2" : ""}`}>
                  <h2 className="text-2xl font-bold mb-4 text-[var(--ds-text-primary)]">{step.title}</h2>
                  <p className="text-[var(--ds-text-secondary)] mb-8 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                  <ul className="space-y-3 text-sm text-[var(--ds-text-secondary)]">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-5 h-5 bg-[var(--ds-border)]/60 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-[var(--ds-text-secondary)]" />
                        </span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={`w-full md:w-1/2 graphic-container rounded-xl min-h-[300px] flex items-center justify-center p-8 ${isReversed ? "md:order-1" : ""}`}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid var(--ds-border)",
                  }}
                >
                  <Illustration />
                </div>
              </motion.section>
            );
          })}
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mt-12"
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
  );
}

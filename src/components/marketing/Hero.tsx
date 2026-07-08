"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const avatars = [
  { initial: "A", color: "bg-blue-100 text-blue-600" },
  { initial: "B", color: "bg-orange-100 text-orange-600" },
  { initial: "C", color: "bg-purple-100 text-purple-600" },
  { initial: "D", color: "bg-emerald-100 text-emerald-600" },
];

export function Hero() {
  return (
    <section className="relative min-h-[calc(630px-56px)] overflow-hidden pb-10">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(67,59,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(67,59,255,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 bottom-0 left-[15%] w-px bg-[var(--ds-primary)]/10" />
        <div className="absolute top-0 bottom-0 right-[15%] w-px bg-[var(--ds-primary)]/10" />
        <div className="absolute left-0 right-0 top-[100px] h-px bg-[var(--ds-primary)]/10" />
        <div className="absolute left-0 right-0 bottom-[180px] h-px bg-[var(--ds-primary)]/10" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--ds-primary)]/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-12">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Customer satisfaction banner - BaseHub style */}
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-3 border border-[var(--ds-border)] border-b-0 px-4 py-2"
          >
            <div className="flex -space-x-3">
              {avatars.map((a, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full border-2 border-white ${a.color} flex items-center justify-center text-[10px] font-semibold`}
                >
                  {a.initial}
                </div>
              ))}
            </div>
            <span className="text-sm text-[var(--ds-text-secondary)] font-medium">
              1,254 happy customers
            </span>
          </motion.div>

          {/* Announcement badge */}
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-primary)]/20 bg-[var(--ds-primary)]/5 px-4 py-1.5 mb-8"
          >
            <span className="text-xs font-semibold text-[var(--ds-primary)]">
              Introducing Partner Referrals
            </span>
            <ArrowRight className="w-3 h-3 text-[var(--ds-primary)]" />
          </motion.div>

          {/* Headline - Direct, pain-focused, one breath */}
          <motion.h1
            variants={fadeUp}
            className="max-w-[800px] text-center text-[clamp(32px,7vw,64px)] leading-[1.1] font-medium tracking-[-1.44px] md:tracking-[-2.16px] text-pretty text-[var(--ds-text-primary)] mb-4"
          >
            The link platform that lets you
            <br />
            <span className="text-[var(--ds-primary)]">fix mistakes after you hit publish</span>
          </motion.h1>

          {/* Subtext - Names the pain, states the fix, adds proof */}
          <motion.p
            variants={fadeUp}
            className="max-w-2xl text-center text-lg md:text-xl text-[var(--ds-text-secondary)] mb-6 leading-relaxed text-pretty"
          >
            Change any destination, swap a QR target, or update a bio page &mdash;
            without breaking what&apos;s already out there.
          </motion.p>

          {/* Proof point - Concrete example */}
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)] mb-10"
          >
            <Check className="w-4 h-4 text-[var(--ds-accent)] shrink-0" />
            <span>Changed a campaign URL 6 months after launch. Zero broken links.</span>
          </motion.div>

          {/* Stacked CTAs - BaseHub style */}
          <motion.div variants={fadeUp} className="relative w-full max-w-[392px]">
            <div className="relative z-10 flex flex-col">
              <Link
                href="/sign-up"
                className="bg-white/60 backdrop-blur-sm border border-[var(--ds-border)] border-b-0 py-4 text-[var(--ds-text-primary)] font-semibold text-center hover:bg-white transition-all text-base"
              >
                Request Demo
              </Link>
              <Link
                href="/sign-up"
                className="bg-[var(--ds-primary)] text-white py-4 text-lg font-semibold shadow-lg text-center hover:bg-[var(--ds-primary-dark)] transition-all flex items-center justify-center gap-2"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

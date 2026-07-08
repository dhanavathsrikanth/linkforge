"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const avatars = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
];

export function Hero() {
  return (
    <section id="hero" className="relative min-h-[calc(680px-56px)] overflow-hidden pb-12">
      {/* Decorative grid columns */}
      <div className="absolute top-0 left-0 z-0 grid h-full w-full grid-cols-[clamp(28px,10vw,120px)_auto_clamp(28px,10vw,120px)] border-b border-border">
        <div className="col-span-1" />
        <div className="border-x border-border col-span-1" />
        <div className="col-span-1" />
      </div>

      {/* Gradient blurs */}
      <div className="bg-accent-500/30 pointer-events-none absolute -bottom-[60%] left-1/2 z-0 block aspect-square w-[600px] -translate-x-1/2 rounded-full blur-[220px]" />
      <div className="bg-accent-400/20 pointer-events-none absolute top-[10%] left-[8vw] z-0 hidden aspect-square w-[25vw] rounded-full blur-[120px] md:block" />
      <div className="bg-accent-300/15 pointer-events-none absolute right-[5vw] bottom-[-10%] z-0 hidden aspect-square w-[22vw] rounded-full blur-[100px] md:block" />

      <div className="divide-border relative z-10 flex flex-col divide-y pt-[35px]">
        {/* Social proof banner */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-end"
        >
          <div className="group flex items-center gap-2.5 border border-border border-b-0 px-4 py-2.5 transition-colors hover:bg-surface-secondary/50">
            <div className="flex -space-x-2.5">
              {avatars.map((src, i) => (
                <Image
                  key={i}
                  alt="User avatar"
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-full border-2 border-surface-primary object-cover transition-transform hover:z-10 hover:scale-110"
                  src={src}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="size-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-text-tertiary text-sm tracking-tight">1,254 happy customers</p>
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <div>
          <div className="mx-auto flex min-h-[300px] max-w-[80vw] shrink-0 flex-col items-center justify-center gap-3 px-2 py-6 sm:px-16 lg:px-24">
            {/* Floating badge */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700 animate-float"
            >
              <Sparkles className="size-3" />
              Now with AI-powered link optimization
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="max-w-3xl text-center text-[clamp(32px,7vw,64px)] leading-[1.08] font-medium tracking-[-1.44px] md:tracking-[-2.16px] text-pretty"
            >
              Short links you can{" "}
              <span className="text-gradient-animated">edit after publishing</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
              className="text-md text-text-tertiary max-w-2xl text-center text-pretty md:text-lg"
            >
              LinkForge is the link management platform that lets you change any
              destination without breaking redirects, QR codes, or embeds.
            </motion.p>
          </div>
        </div>

        {/* Stacked CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="flex items-start justify-center px-8 sm:px-24"
        >
          <div className="flex w-full max-w-[80vw] flex-col items-center justify-start md:max-w-[400px]">
            <Link
              href="/sign-up"
              className="group border-x border-border flex w-full items-center justify-center gap-2 border-y-0 bg-transparent backdrop-blur-xl py-4 text-base font-medium text-text-primary transition-all duration-200 hover:bg-surface-secondary/60"
            >
              Request Demo
              <ArrowRight className="size-4 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
            <Link
              href="/sign-up"
              className="group flex w-full items-center justify-center gap-2 bg-accent-500 py-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-200 hover:bg-accent-600 hover:shadow-[0_0_30px_rgba(124,58,237,0.4)]"
            >
              Get Started for Free
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

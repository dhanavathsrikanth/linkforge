"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Link2, ArrowRight } from "lucide-react";

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "Customers", href: "#customers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--ds-border)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ds-primary)] text-white">
            <Link2 className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-[var(--ds-text-primary)] tracking-tight">pivoturl</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 text-sm font-medium text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors rounded-md"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 text-sm font-medium text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors rounded-md"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--ds-primary)] px-3.5 text-sm font-semibold text-white transition-all hover:bg-[var(--ds-primary-dark)] active:scale-[0.98]"
          >
            Start for free <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-secondary)] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-[var(--ds-border)] overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) =>
                item.href.startsWith("/") ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-secondary)] rounded-md"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-secondary)] rounded-md"
                  >
                    {item.label}
                  </a>
                )
              )}
              <div className="pt-2 mt-2 border-t border-[var(--ds-border)] space-y-1">
                <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-[var(--ds-text-secondary)]">Log in</Link>
                <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} className="block text-center py-2 rounded-lg bg-[var(--ds-primary)] text-white text-sm font-semibold">Start for free</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

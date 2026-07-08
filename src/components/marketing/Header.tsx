"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Link2 } from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Product",
    href: "#features",
    children: [
      { label: "Short Links", href: "#features" },
      { label: "Bio Pages", href: "#features" },
      { label: "QR Codes", href: "#features" },
      { label: "Analytics", href: "#analytics" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky left-0 top-0 z-50 flex w-full flex-col border-b border-border bg-surface-primary/80 backdrop-blur-xl">
      <div className="flex h-14 bg-surface-primary/80">
        <div className="container mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500 text-white transition-transform duration-200 group-hover:scale-105">
              <Link2 className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">LinkForge</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center justify-center">
            <ul className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <li key={item.label} className="relative">
                    <button
                      onMouseEnter={() => setOpenDropdown(item.label)}
                      onMouseLeave={() => setOpenDropdown(null)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-normal tracking-tight text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-all duration-200"
                    >
                      {item.label}
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary transition-transform duration-200" />
                    </button>
                    <AnimatePresence>
                      {openDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                          onMouseEnter={() => setOpenDropdown(item.label)}
                          onMouseLeave={() => setOpenDropdown(null)}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 rounded-xl border border-border bg-surface-primary p-1.5 shadow-xl"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="block rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors duration-150"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                ) : (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-normal tracking-tight text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-all duration-200"
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center justify-end gap-2">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-full border border-border bg-surface-secondary px-4 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-all duration-200"
            >
              Log In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-full bg-accent-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-600 transition-all duration-200 shadow-[0_0_12px_rgba(124,58,237,0.2)] hover:shadow-[0_0_18px_rgba(124,58,237,0.3)]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex items-center justify-center rounded-md border border-border bg-surface-secondary p-1.5 text-text-secondary hover:text-text-primary hover:border-accent-200 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden border-t border-border overflow-hidden bg-surface-primary/95 backdrop-blur-xl"
          >
            <div className="px-6 py-4 space-y-1">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-150"
                    >
                      {item.label}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === item.label ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {openDropdown === item.label && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pl-4"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-150"
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="pt-3 mt-3 border-t border-border space-y-2">
                <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150">Log in</Link>
                <Link href="/sign-up" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 rounded-full bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-all duration-200 shadow-[0_0_12px_rgba(124,58,237,0.2)]">Get Started</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

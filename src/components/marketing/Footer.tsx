import Link from "next/link";
import { Link2 } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Short Links", href: "#features" },
    { label: "Bio Pages", href: "#features" },
    { label: "QR Codes", href: "#features" },
    { label: "Analytics", href: "#analytics" },
    { label: "Pricing", href: "/pricing" },
  ],
  Resources: [
    { label: "Docs", href: "/docs" },
    { label: "API Reference", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Status", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
};

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com", icon: "GH" },
  { label: "X", href: "https://x.com", icon: "X" },
  { label: "Discord", href: "https://discord.gg", icon: "DC" },
  { label: "LinkedIn", href: "https://linkedin.com", icon: "LI" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto grid grid-cols-2 grid-rows-[auto_auto_auto] place-items-start items-center gap-y-7 px-6 sm:grid-cols-[1fr_auto_1fr] sm:grid-rows-2 sm:gap-x-3 sm:gap-y-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500 text-white transition-transform duration-200 group-hover:scale-105">
            <Link2 className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold tracking-tight">LinkForge</span>
        </Link>

        {/* Nav links */}
        <nav className="col-start-1 row-start-2 flex flex-col gap-x-2 gap-y-3 self-center sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-row sm:items-center md:gap-x-4 lg:gap-x-8">
          {Object.values(FOOTER_LINKS).flat().slice(0, 5).map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-2 text-sm font-light tracking-tight text-text-tertiary hover:text-text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="col-span-2 text-sm text-text-tertiary sm:col-span-1">
          &copy; 2026 LinkForge, Inc. All rights reserved.
        </p>

        {/* Social + legal */}
        <ul className="col-span-2 col-start-1 row-start-3 flex w-full items-center gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-2 sm:w-auto sm:flex-wrap sm:justify-self-end">
          {SOCIAL_LINKS.map(({ label, href, icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-secondary text-[10px] font-semibold text-text-tertiary hover:text-text-primary hover:border-accent-200 hover:bg-accent-50 transition-all duration-200"
                aria-label={label}
              >
                {icon}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

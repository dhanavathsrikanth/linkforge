import Link from "next/link";
import { Link2 } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Link Shortener", href: "#features" },
    { label: "Bio Pages", href: "#bio" },
    { label: "QR Codes", href: "#qr" },
    { label: "Analytics", href: "#analytics" },
  ],
  Resources: [
    { label: "Docs", href: "/docs" },
    { label: "API", href: "/docs" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--ds-border)] py-12 sm:py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ds-primary)] text-white">
                <Link2 className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold text-[var(--ds-text-primary)] tracking-tight">pivoturl</span>
            </div>
            <p className="text-xs text-[var(--ds-text-secondary)] leading-relaxed max-w-[200px]">
              The link management platform for modern marketing teams.
            </p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold text-[var(--ds-text-primary)] mb-3 uppercase tracking-wider">{title}</h4>
              <div className="space-y-2.5">
                {links.map((link) =>
                  link.href.startsWith("/") ? (
                    <Link key={link.label} href={link.href} className="block text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <a key={link.label} href={link.href} className="block text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors">
                      {link.label}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-[var(--ds-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors">Terms of Service</Link>
            <span className="text-xs text-[var(--ds-text-secondary)]">&copy; 2026 PivotURL, Inc.</span>
          </div>
          <div className="flex items-center gap-3">
            {[
              { href: "https://twitter.com", label: "X" },
              { href: "https://github.com", label: "GitHub" },
              { href: "https://linkedin.com", label: "LinkedIn" },
            ].map(({ href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-secondary)] transition-colors text-xs font-semibold"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, Users, History, Webhook, Link2, Key, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Account",       href: "/dashboard/settings/account",       icon: UserCircle },
  { name: "Members",       href: "/dashboard/settings/members",       icon: Users },
  { name: "Billing",       href: "/dashboard/settings/billing",       icon: CreditCard },
  { name: "Domains",       href: "/dashboard/settings/domains",       icon: Globe },
  { name: "API Keys",      href: "/dashboard/settings/api-keys",      icon: Key },
  { name: "UTM Templates", href: "/dashboard/settings/utm-templates", icon: Link2 },
  { name: "Audit Logs",    href: "/dashboard/settings/audit-logs",    icon: History },
  { name: "Webhooks",      href: "/dashboard/settings/webhooks",      icon: Webhook },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWebhooks = pathname === "/dashboard/settings/webhooks";

  return (
    // Negative margin cancels the outer <main> padding so settings fills edge-to-edge
    <div className="-m-4 sm:-m-6 lg:-m-10 flex h-[calc(100vh-3.5rem)] gap-0 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
          Settings
        </h2>
        <nav className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tab bar */}
      <div className="flex md:hidden w-full flex-col overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border gap-1 p-2 shrink-0">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </div>
        <div className={cn("flex-1 overflow-y-auto", isWebhooks ? "p-0" : "p-4")}>
          {children}
        </div>
      </div>

      {/* Desktop content area */}
      <div className={cn("hidden md:flex flex-1 overflow-y-auto", isWebhooks ? "p-0" : "p-6")}>
        {children}
      </div>
    </div>
  );
}

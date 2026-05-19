"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, CreditCard, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "General", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
  { name: "Domains", href: "/dashboard/settings/domains", icon: Globe },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === "/dashboard/settings";

  if (isIndex) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full gap-0">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
          Settings
        </h2>
        <nav className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const active = tab.href === "/dashboard/settings"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
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

      <div className="flex md:hidden w-full flex-col">
        <div className="flex overflow-x-auto border-b border-border gap-1 p-2 shrink-0">
          {tabs.map((tab) => {
            const active = tab.href === "/dashboard/settings"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
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
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>

      <div className="hidden md:flex flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}

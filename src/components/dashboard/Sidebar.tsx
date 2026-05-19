"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Link2,
  LayoutDashboard,
  BarChart3,
  Settings,
  QrCode,
  Globe,
  CreditCard,
  LayoutList,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { useEffect, useState } from "react";

const mainNav = [
  { name: "Overview",    href: "/dashboard",                  icon: LayoutDashboard },
  { name: "Links",       href: "/dashboard/links",            icon: Link2 },
  { name: "Link in Bio", href: "/link-in-bio",                icon: LayoutList,      badge: "COMING SOON" },
  { name: "QR Codes",    href: "/dashboard/qr",               icon: QrCode },
  { name: "Analytics",   href: "/dashboard/analytics",        icon: BarChart3 },
];

const workspaceNav = [
  { name: "Domains",     href: "/settings/domains",           icon: Globe,           badge: "COMING SOON" },
  { name: "Billing",     href: "/dashboard/billings",         icon: CreditCard },
  { name: "Settings",    href: "/dashboard/settings",         icon: Settings },
];

function NavItem({ item, active }: { item: typeof mainNav[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
      )}
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="flex-1 leading-none">{item.name}</span>
      {item.badge && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    fetch("/api/workspaces/current")
      .then(res => res.json())
      .then(data => {
        if (data.workspace?.plan) {
          setPlan(data.workspace.plan);
        }
      })
      .catch(console.error);
  }, []);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  const initial = user?.firstName?.charAt(0) ?? (user ? "U" : "");
  const displayName = user?.fullName || user?.firstName || (user ? "User" : "");

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-background border-r border-border h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-14 shrink-0 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold tracking-tight text-foreground">LinkForge</span>
      </div>

      {/* User profile */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0 border-b border-border">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={displayName}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground ring-2 ring-border">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </div>
          <PlanBadge plan={plan} asLink />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Main
        </div>
        {mainNav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <div className="mt-5 mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Workspace
        </div>
        {workspaceNav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
    </aside>
  );
}

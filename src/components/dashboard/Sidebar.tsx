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
  Code2,
  Key,
  Webhook,
  SearchCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { useEffect, useState } from "react";

const mainNav = [
  { name: "Overview",        href: "/dashboard",                  icon: LayoutDashboard },
  { name: "Links",           href: "/dashboard/links",            icon: Link2 },
  { name: "Link Checker",    href: "/dashboard/link-checker",     icon: SearchCheck },
  { name: "Link in Bio",     href: "/dashboard/link-in-bio",      icon: LayoutList,      badge: "COMING SOON" },
  { name: "QR Codes",        href: "/dashboard/qr",               icon: QrCode },
  { name: "Analytics",       href: "/dashboard/analytics",        icon: BarChart3 },
];

const workspaceNav = [
  { name: "Domains",     href: "/dashboard/domain",           icon: Globe,           badge: "COMING SOON" },
  { name: "Billing",     href: "/dashboard/billings",         icon: CreditCard },
  { name: "Settings",    href: "/dashboard/settings",         icon: Settings },
];

const developersNav = [
  { name: "API Docs",    href: "/docs",                       icon: Code2 },
  { name: "API Keys",    href: "/dashboard/developers/api-keys", icon: Key },
  { name: "Webhooks",    href: "/dashboard/settings/webhooks",   icon: Webhook },
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
  const { workspace } = useWorkspace();
  const plan = workspace?.plan || "free";

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  const initial = user?.firstName?.charAt(0) ?? (user ? "U" : "");
  const displayName = user?.fullName || user?.firstName || (user ? "User" : "");

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-background border-r border-border h-screen sticky top-0">
      {/* Brand + Workspace Switcher */}
      <div className="flex flex-col shrink-0 border-b border-border">
        <div className="flex items-center gap-2.5 px-5 h-11">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">LinkForge</span>
        </div>
        <div className="px-2 pb-2">
          <WorkspaceSwitcher />
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

        <div className="mt-auto mb-1 pt-4 border-t border-border px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Developers
        </div>
        {developersNav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
    </aside>
  );
}

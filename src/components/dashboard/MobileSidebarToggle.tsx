"use client";

import { useState } from "react";
import { X, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { useEffect } from "react";
import {
  Link2, LayoutDashboard, BarChart3, Settings, QrCode,
  Globe, CreditCard, LayoutList, Zap,
  Code2, Key,
} from "lucide-react";

const mainNav = [
  { name: "Overview",    href: "/dashboard",                  icon: LayoutDashboard },
  { name: "Links",       href: "/dashboard/links",            icon: Link2 },
  { name: "Link in Bio", href: "/dashboard/link-in-bio",      icon: LayoutList },
  { name: "QR Codes",    href: "/dashboard/qr",               icon: QrCode },
  { name: "Analytics",   href: "/dashboard/analytics",        icon: BarChart3 },
];

const workspaceNav = [
  { name: "Domains",     href: "/dashboard/domain",           icon: Globe },
  { name: "Billing",     href: "/dashboard/billings",         icon: CreditCard },
  { name: "Settings",    href: "/dashboard/settings",         icon: Settings },
];

const developersNav = [
  { name: "API Docs",    href: "/docs",                       icon: Code2 },
  { name: "API Keys",    href: "/dashboard/developers/api-keys", icon: Key },
];

export function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);
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

  const navLink = (item: (typeof mainNav)[number], onClose: () => void) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        isActive(item.href)
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {isActive(item.href) && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
      )}
      <item.icon className={cn("h-4 w-4 shrink-0", isActive(item.href) ? "text-primary" : "text-muted-foreground")} />
      <span className="flex-1 leading-none">{item.name}</span>
    </Link>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg lg:hidden dark:bg-slate-100 dark:text-slate-900"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-60 flex-col bg-background border-r border-border shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col shrink-0 border-b border-border">
              <div className="flex items-center gap-2.5 px-5 h-11">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground">PivotUrl</span>
              </div>
              <div className="px-2 pb-2">
                <WorkspaceSwitcher />
              </div>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
              <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Main</div>
              {mainNav.map((item) => navLink(item, () => setOpen(false)))}
              <div className="mt-5 mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Workspace</div>
              {workspaceNav.map((item) => navLink(item, () => setOpen(false)))}
              <div className="mt-auto mb-1 pt-4 border-t border-border px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Developers</div>
              {developersNav.map((item) => navLink(item, () => setOpen(false)))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

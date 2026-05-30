"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Link2,
  LayoutDashboard,
  BarChart3,
  Settings,
  QrCode,
  Zap,
  Code2,
  SearchCheck,
  Sparkles,
  User,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { WorkspaceSwitcher } from "@/components/dashboard/WorkspaceSwitcher";
import { useEffect, useState } from "react";

const mainNav = [
  { name: "Overview",        href: "/dashboard",                    icon: LayoutDashboard },
  { name: "Link in Bio",     href: "/dashboard/bio",                icon: User },
  { name: "Links",           href: "/dashboard/links",              icon: Link2 },
  { name: "Link Checker",    href: "/dashboard/link-checker",       icon: SearchCheck },
  { name: "Link Safety",     href: "/dashboard/link-safety",        icon: ShieldCheck },
  { name: "QR Codes",        href: "/dashboard/qr",                 icon: QrCode },
  { name: "Analytics",       href: "/dashboard/analytics",          icon: BarChart3 },
  { name: "Insights",        href: "/dashboard/analytics/insights", icon: Sparkles },
];

const workspaceNav = [
  { name: "Settings",    href: "/dashboard/settings",         icon: Settings },
];

const developersNav = [
  { name: "API Docs",    href: "/docs",                       icon: Code2 },
];

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: typeof mainNav[number];
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.name : undefined}
      className={cn(
        "group/item relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
      )}
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span
        className={cn(
          "flex-1 leading-none transition-opacity duration-150",
          // When the parent <aside> is collapsed, hide the label until
          // hover. The label still occupies layout space — it just fades —
          // so the row width feels stable while the sidebar expands.
          collapsed && "opacity-0 group-hover/sidebar:opacity-100"
        )}
      >
        {item.name}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const plan = workspace?.plan || "free";

  // Detect bio EDITOR — collapse the sidebar to icons-only there to
  // give the canvas / editor sidebar more room. Hovering re-expands.
  // The list, settings, analytics, and integrations pages keep the
  // full-width dashboard sidebar.
  const isBioEditor = /^\/dashboard\/bio\/[^/]+\/edit(?:\/|$)/.test(pathname);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  const initial = user?.firstName?.charAt(0) ?? (user ? "U" : "");
  const displayName = user?.fullName || user?.firstName || (user ? "User" : "");

  return (
    <aside
      className={cn(
        // `group` here lets descendants react to hover on the whole aside.
        // `transition-[width]` animates the icon-only ⇆ full expansion.
        "group/sidebar hidden lg:flex shrink-0 flex-col bg-background border-r border-border h-screen sticky top-0 transition-[width] duration-200 ease-out",
        // On bio editor: collapse to 56px, expand to 240px on hover.
        // Everywhere else: stay at 240px constantly.
        isBioEditor ? "w-14 hover:w-60 z-30" : "w-60",
        // When collapsed and floating-expanding, sit above the page so
        // hover-revealed labels don't push the canvas around.
        isBioEditor && "hover:shadow-2xl"
      )}
      data-collapsed={isBioEditor || undefined}
    >
      {/* Brand + Workspace Switcher */}
      <div className="flex flex-col shrink-0 border-b border-border">
        <div className="flex items-center gap-2.5 px-5 h-11">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span
            className={cn(
              "text-sm font-bold tracking-tight text-foreground whitespace-nowrap transition-opacity duration-150",
              isBioEditor && "opacity-0 group-hover/sidebar:opacity-100"
            )}
          >
            LinkForge
          </span>
        </div>
        <div
          className={cn(
            "px-2 pb-2 transition-opacity duration-150",
            // Hide the workspace switcher entirely while collapsed —
            // its dropdown caret would peek out of the icon strip.
            isBioEditor && "opacity-0 group-hover/sidebar:opacity-100 pointer-events-none group-hover/sidebar:pointer-events-auto"
          )}
        >
          <WorkspaceSwitcher />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3 py-4">
        <SectionLabel hidden={isBioEditor}>Main</SectionLabel>
        {mainNav.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={isBioEditor}
          />
        ))}

        <SectionLabel hidden={isBioEditor}>Workspace</SectionLabel>
        {workspaceNav.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={isBioEditor}
          />
        ))}

        <div
          className={cn(
            "mt-auto pt-4 border-t border-border",
            !isBioEditor && "mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60"
          )}
        >
          {!isBioEditor && "Developers"}
        </div>
        {developersNav.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={isBioEditor}
          />
        ))}
      </nav>
    </aside>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  hidden,
  className,
}: {
  children: React.ReactNode;
  hidden?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap transition-opacity duration-150",
        // First label has no top margin; subsequent labels get spacing
        // below from the nav gap, so we don't need to vary it here.
        hidden && "opacity-0 group-hover/sidebar:opacity-100 mt-5 first:mt-0",
        !hidden && "first:mt-0 mt-5",
        className
      )}
    >
      {children}
    </div>
  );
}

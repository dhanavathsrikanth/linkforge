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
  Users,
  CreditCard,
  MoreHorizontal,
  LayoutList,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

const nav = [
  { name: "Overview",    href: "/dashboard",                  icon: LayoutDashboard },
  { name: "Links",       href: "/dashboard/links",            icon: Link2 },
  { name: "Link in Bio", href: "/dashboard/link-in-bio",      icon: LayoutList },
  { name: "QR Codes",    href: "/dashboard/qr",               icon: QrCode },
  { name: "Analytics",   href: "/dashboard/analytics",        icon: BarChart3 },
  { name: "Domains",     href: "/dashboard/settings/domains", icon: Globe },
  { name: "Team",        href: "/dashboard/team",             icon: Users },
  { name: "Pricing",     href: "/pricing",                    icon: Sparkles },
  { name: "Billing",     href: "/dashboard/settings/billing", icon: CreditCard },
  { name: "Settings",    href: "/dashboard/settings",         icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  const initial = user?.firstName?.charAt(0) ?? "U";
  const displayName = user?.fullName || user?.firstName || "Coolest User";

  return (
    <aside className="flex w-[240px] shrink-0 flex-col bg-background border-r border-border h-screen sticky top-0">
      {/* User profile */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={displayName}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary text-sm font-semibold">
            {initial}
          </div>
        )}
        <span className="flex-1 truncate text-sm font-semibold text-foreground">
          {displayName}
        </span>
        <button className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Nav — scrollable so all items show on short screens */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2 overflow-y-auto">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1 leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

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
  ChevronDown,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";

const nav = [
  {
    group: null,
    items: [
      { name: "Overview",      href: "/dashboard",                    icon: LayoutDashboard },
      { name: "Links",         href: "/dashboard/links",              icon: Link2           },
      { name: "QR Codes",      href: "/dashboard/qr",                 icon: QrCode,  badge: "Beta" },
      { name: "Analytics",     href: "/dashboard/analytics",          icon: BarChart3       },
    ],
  },
  {
    group: "Settings",
    items: [
      { name: "Custom Domains", href: "/dashboard/settings/domains",  icon: Globe           },
      { name: "Team Members",   href: "/dashboard/team",              icon: Users           },
      { name: "Billing",        href: "/dashboard/settings/billing",  icon: CreditCard      },
      { name: "Settings",       href: "/dashboard/settings",          icon: Settings        },
    ],
  },
];

function NavItem({
  item,
  isActive,
}: {
  item: { name: string; href: string; icon: React.ElementType; badge?: string };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-100",
        isActive
          ? "bg-[#433BFF] text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
        )}
      />
      <span className="flex-1 leading-none">{item.name}</span>
      {item.badge && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            isActive ? "bg-white/20 text-white" : "bg-[#DEDCFF] text-[#433BFF]"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[240px] flex-col border-r border-slate-200 bg-white md:flex">

      {/* Logo */}
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-slate-100 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#433BFF] shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-900">LinkForge</span>
        <button className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 transition-colors">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {nav.map(({ group, items }, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Upgrade nudge */}
        <div className="mt-4 rounded-xl border border-[#DEDCFF] bg-[#433BFF]/5 p-4">
          <p className="text-xs font-semibold text-[#433BFF]">Upgrade to Pro</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Unlimited links, domains & analytics reports.
          </p>
          <button className="mt-3 w-full rounded-lg bg-[#433BFF] py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3730E8] transition-colors">
            View Plans
          </button>
        </div>
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName ?? "User"}
              className="h-8 w-8 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DEDCFF] text-[#433BFF] text-xs font-semibold border border-slate-200">
              {user?.firstName?.charAt(0) ?? "U"}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-xs font-semibold text-slate-900">
              {user?.fullName || user?.firstName || "User"}
            </p>
            <p className="truncate text-[10px] text-slate-400">
              {user?.primaryEmailAddress?.emailAddress || "Free Plan"}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 transition-all"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

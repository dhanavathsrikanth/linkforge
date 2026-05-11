"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2, LayoutDashboard, BarChart3, Settings } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Links", href: "/dashboard/links", icon: Link2 },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

import { FeedbackModal } from "./FeedbackModal";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#09090b] flex flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
          <Link2 className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Link<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Forge</span>
        </span>
      </div>
      
      <div className="flex-1 py-6 px-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-sm" 
                  : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-violet-400" : "text-zinc-400")} />
              {item.name}
            </Link>
          );
        })}

        <FeedbackModal />
      </div>
    </aside>
  );
}

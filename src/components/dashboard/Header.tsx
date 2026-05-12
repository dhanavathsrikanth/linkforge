"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Command, HelpCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

// Map pathnames → human-readable title + optional breadcrumb parent
const routeMap: Record<string, { title: string; parent?: string }> = {
  "/dashboard":                     { title: "Overview"        },
  "/dashboard/links":               { title: "Links"           },
  "/dashboard/links/new":           { title: "New Link",        parent: "Links"       },
  "/dashboard/qr":                  { title: "QR Codes"        },
  "/dashboard/analytics":           { title: "Analytics"       },
  "/dashboard/settings":            { title: "Settings"        },
  "/dashboard/settings/domains":    { title: "Custom Domains",  parent: "Settings"    },
  "/dashboard/settings/billing":    { title: "Billing",         parent: "Settings"    },
  "/dashboard/team":                { title: "Team Members"    },
};

function getRoute(pathname: string) {
  return routeMap[pathname] ?? {
    title: pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Dashboard",
  };
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { title, parent } = getRoute(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-[60px] shrink-0 items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">

      {/* Left — breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {parent ? (
          <>
            <span className="font-medium text-slate-400">{parent}</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{title}</span>
          </>
        ) : (
          <span className="font-semibold text-slate-900">{title}</span>
        )}
      </div>

      {/* Right — controls */}
      <div className="ml-auto flex items-center gap-2">

        {/* Command search */}
        <button
          onClick={() =>
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
          }
          className="hidden h-8 w-52 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 shadow-xs transition-all hover:border-slate-300 hover:bg-white md:flex"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            Search...
          </span>
          <span className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono font-medium text-slate-400">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </button>

        {/* Help */}
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-xs hover:bg-slate-50 hover:text-slate-600 transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-xs hover:bg-slate-50 hover:text-slate-600 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#433BFF] ring-1 ring-white" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Clerk user button */}
        <div className="overflow-hidden rounded-full border border-slate-200 bg-white shadow-xs transition-all hover:ring-2 hover:ring-[#433BFF]/20">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7",
                userButtonPopoverCard: "bg-white border border-slate-200 shadow-xl rounded-xl text-slate-900",
                userPreviewSecondaryIdentifier: "text-slate-500 text-xs",
                userButtonPopoverActionButton: "hover:bg-slate-50 text-slate-700 rounded-lg text-sm",
                userButtonPopoverActionButtonIcon: "text-slate-400",
                userButtonPopoverFooter: "border-t border-slate-100",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}

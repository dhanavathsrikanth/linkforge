"use client";

import { UserButton, OrganizationSwitcher, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { Bell, Search, Building2, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { useCommandPalette } from "@/hooks/useCommandPalette";

export function Header() {
  const pathname = usePathname();
  const { open: openPalette } = useCommandPalette();
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC") || navigator.userAgent.includes("Mac"));
  }, []);

  const isBioEditor = /^\/dashboard\/bio\/[^/]+\/edit(?:\/|$)/.test(pathname);
  if (isBioEditor) return null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-6">
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <Breadcrumbs className="lg:hidden" />
        <button
          type="button"
          onClick={openPalette}
          className="relative hidden sm:flex flex-1 max-w-md items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="flex items-center h-9">
          <ClerkLoading>
            <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
          </ClerkLoading>
          <ClerkLoaded>
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
              afterSelectPersonalUrl="/dashboard"
              organizationProfileUrl="/organization-profile"
              createOrganizationUrl="/create-organization"
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "h-9 rounded-lg border border-border bg-background px-2 sm:px-3 text-sm text-foreground hover:bg-muted transition-colors max-w-[120px] sm:max-w-none truncate",
                },
              }}
            />
          </ClerkLoaded>
        </div>
        <button
          type="button"
          suppressHydrationWarning
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="ml-0 sm:ml-1 flex items-center h-9">
          <ClerkLoading>
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </ClerkLoading>
          <ClerkLoaded>
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: { avatarBox: "h-7 w-7 sm:h-8 sm:w-8" },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Action label="manageAccount" />
                <UserButton.Action label="signOut" />
                <UserButton.Link label="Organizations" href="/organizations" labelIcon={<Building2 className="h-4 w-4" />} />
                <UserButton.Link label="Create Organization" href="/create-organization" labelIcon={<Plus className="h-4 w-4" />} />
              </UserButton.MenuItems>
            </UserButton>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}

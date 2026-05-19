"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { Bell, Search, Building2, Plus, List } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <OrganizationSwitcher
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
          afterSelectPersonalUrl="/dashboard"
          organizationProfileUrl="/organization-profile"
          createOrganizationUrl="/create-organization"
          appearance={{
            elements: {
              organizationSwitcherTrigger: "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted transition-colors",
            },
          }}
        />
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="ml-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          >
            <UserButton.MenuItems>
              <UserButton.Action label="manageAccount" />
              <UserButton.Action label="signOut" />
              <UserButton.Link label="Organizations" href="/organizations" labelIcon={<Building2 className="h-4 w-4" />} />
              <UserButton.Link label="Create Organization" href="/create-organization" labelIcon={<Plus className="h-4 w-4" />} />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </div>
    </header>
  );
}

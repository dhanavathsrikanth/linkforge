"use client";

import {
  OrganizationProfile,
  CreateOrganization,
  useOrganization,
} from "@clerk/nextjs";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";

const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent p-0",
    navbar: "bg-transparent",
    navbarButtonIcon: "text-foreground",
    navbarButton: "text-muted-foreground hover:text-foreground",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    formFieldLabel: "text-foreground",
    formFieldInput: "bg-background border-border text-foreground",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    pageScrollBox: "bg-transparent",
    scrollBox: "p-0",
    content: "p-0",
  },
};

export default function MembersPage() {
  const { organization, isLoaded } = useOrganization();
  const [creating, setCreating] = useState(false);

  if (!isLoaded) {
    return (
      <div className="text-sm text-muted-foreground">Loading members...</div>
    );
  }

  // No organization yet — show empty state with inline create flow
  if (!organization) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Members
          </h2>
          <p className="text-sm text-muted-foreground">
            Invite teammates, manage roles, and review pending invitations.
          </p>
        </div>

        {creating ? (
          <div className="w-full">
            <CreateOrganization
              routing="hash"
              afterCreateOrganizationUrl="/dashboard/settings/members"
              appearance={clerkAppearance}
            />
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 mb-4">
              <Building2 className="h-7 w-7 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No organization yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create an organization to invite team members, manage roles, and
              collaborate on links.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </button>
          </div>
        )}
      </div>
    );
  }

  // Has org — render Clerk's OrganizationProfile inline
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Members
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your organization profile, members, invitations, and roles.
        </p>
      </div>

      <OrganizationProfile routing="hash" appearance={clerkAppearance} />
    </div>
  );
}

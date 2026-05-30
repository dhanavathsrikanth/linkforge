"use client";

import {
  UserProfile,
  OrganizationProfile,
  CreateOrganization,
} from "@clerk/nextjs";
import { Building2, Plus } from "lucide-react";

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

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Accounts
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, security, connected accounts, and active sessions.
        </p>
      </div>

      <UserProfile routing="hash" appearance={clerkAppearance}>
        <UserProfile.Page
          label="Organization"
          url="organization"
          labelIcon={<Building2 className="h-4 w-4" />}
        >
          <OrganizationProfile appearance={clerkAppearance} />
        </UserProfile.Page>

        <UserProfile.Page
          label="Create organization"
          url="create-organization"
          labelIcon={<Plus className="h-4 w-4" />}
        >
          <CreateOrganization appearance={clerkAppearance} />
        </UserProfile.Page>
      </UserProfile>
    </div>
  );
}

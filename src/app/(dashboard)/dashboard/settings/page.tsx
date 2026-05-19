"use client";

import { UserProfile } from "@clerk/nextjs";
import { Building2, Plus } from "lucide-react";

export default function SettingsPage() {
  return (
      <UserProfile
        routing="hash"
        appearance={{
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
            formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
            pageScrollBox: "bg-transparent",
            scrollBox: "p-0",
            content: "p-0",
          },
        }}
      >
        <UserProfile.Link label="Organizations" url="/organizations" labelIcon={<Building2 className="h-4 w-4" />} />
        <UserProfile.Link label="Create Organization" url="/create-organization" labelIcon={<Plus className="h-4 w-4" />} />
      </UserProfile>
  );
}

import { OrganizationProfile } from "@clerk/nextjs";

export default function OrganizationProfilePage() {
  return (
    <OrganizationProfile
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
    />
  );
}

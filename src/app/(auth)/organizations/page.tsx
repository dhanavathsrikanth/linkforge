import { OrganizationList } from "@clerk/nextjs";

export default function OrganizationListPage() {
  return (
    <OrganizationList
      afterCreateOrganizationUrl="/dashboard"
      afterSelectPersonalUrl="/dashboard"
      afterSelectOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
    />
  );
}

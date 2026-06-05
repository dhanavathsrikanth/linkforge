import { CreateOrganization } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return (
    <CreateOrganization
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
    />
  );
}

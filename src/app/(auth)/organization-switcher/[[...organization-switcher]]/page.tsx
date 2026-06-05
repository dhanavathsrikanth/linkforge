import { OrganizationSwitcher } from "@clerk/nextjs";

export default function OrganizationSwitcherPage() {
  return (
    <OrganizationSwitcher
      hidePersonal={false}
      afterCreateOrganizationUrl="/dashboard"
      afterSelectOrganizationUrl="/dashboard"
      afterSelectPersonalUrl="/dashboard"
    />
  );
}

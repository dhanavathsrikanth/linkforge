import { OrganizationSwitcher } from "@clerk/nextjs";

export default function OrganizationSwitcherPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] p-8">
      <OrganizationSwitcher />
    </div>
  );
}

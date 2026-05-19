import { OrganizationList } from "@clerk/nextjs";

export default function OrganizationListPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] p-8">
      <OrganizationList
        afterCreateOrganizationUrl="/dashboard"
        afterSelectPersonalUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
      />
    </div>
  );
}

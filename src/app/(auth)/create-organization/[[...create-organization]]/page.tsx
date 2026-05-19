import { CreateOrganization } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] p-8">
      <CreateOrganization />
    </div>
  );
}

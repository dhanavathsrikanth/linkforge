import { OrganizationProfile } from "@clerk/nextjs";

export default function OrganizationProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] p-8">
      <OrganizationProfile />
    </div>
  );
}

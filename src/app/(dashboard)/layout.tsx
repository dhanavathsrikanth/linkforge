import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header as Topbar } from "@/components/dashboard/Header";
import { BillingProvider } from "@/providers/BillingProvider";
import { WorkspaceProvider } from "@/providers/WorkspaceProvider";
import { MobileSidebarToggle } from "@/components/dashboard/MobileSidebarToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BillingProvider>
    <WorkspaceProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <MobileSidebarToggle />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
    </WorkspaceProvider>
    </BillingProvider>
  );
}

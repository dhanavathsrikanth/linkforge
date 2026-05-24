"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header as Topbar } from "@/components/dashboard/Header";
import { BillingProvider } from "@/providers/BillingProvider";
import { WorkspaceProvider, useWorkspace } from "@/providers/WorkspaceProvider";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { MobileSidebarToggle } from "@/components/dashboard/MobileSidebarToggle";

function RealtimeWrapper({ children }: { children: React.ReactNode }) {
  const { workspace } = useWorkspace();
  return (
    <RealtimeProvider workspaceId={workspace?.id ?? null}>
      {children}
    </RealtimeProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BillingProvider>
    <WorkspaceProvider>
    <RealtimeWrapper>
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
    </RealtimeWrapper>
    </WorkspaceProvider>
    </BillingProvider>
  );
}

"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header as Topbar } from "@/components/dashboard/Header";
import { BillingProvider } from "@/providers/BillingProvider";
import { WorkspaceProvider, useWorkspace } from "@/providers/WorkspaceProvider";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { MobileSidebarToggle } from "@/components/dashboard/MobileSidebarToggle";
import { CommandPalette } from "@/components/CommandPalette";

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
      <div className="flex-1 flex flex-col overflow-x-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10 min-w-0">
          {children}
        </main>
      </div>
    </div>
    <CommandPalette />
    </RealtimeWrapper>
    </WorkspaceProvider>
    </BillingProvider>
  );
}

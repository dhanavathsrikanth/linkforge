import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header as Topbar } from "@/components/dashboard/Header";
import { BillingProvider } from "@/providers/BillingProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BillingProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </BillingProvider>
  );
}

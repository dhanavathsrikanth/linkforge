import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

// Dashboard shell layout — sidebar + main content area
// Wired to Clerk auth guard and sidebar nav component
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#040405] selection:bg-violet-500/30">
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none" />
        
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-0">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

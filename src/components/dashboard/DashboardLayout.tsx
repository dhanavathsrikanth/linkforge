"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useUser } from "@/hooks/useUser";
import { CommandPalette } from "@/components/CommandPalette";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: userLoading } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking auth
  if (!isLoaded || (isSignedIn && userLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-b-[var(--ds-accent)]"></div>
      </div>
    );
  }

  // Don't render anything if not signed in (will redirect)
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] text-slate-900 selection:bg-[#433BFF]/20 selection:text-[#433BFF]">
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden md:pl-[240px]">
        <Header />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      
      <CommandPalette />
    </div>
  );
}

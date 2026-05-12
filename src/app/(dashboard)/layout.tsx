import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

// Dashboard shell layout — sidebar + main content area
// Wired to Clerk auth guard and sidebar nav component
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

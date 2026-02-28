import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardOverlays } from "@/components/dashboard/dashboard-overlays";
import { AccountSetup } from "@/components/dashboard/account-setup";
import { AppProvider } from "@/lib/context/app-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <div className="flex min-h-screen">
        <AccountSetup />
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <DashboardOverlays />
      </div>
    </AppProvider>
  );
}

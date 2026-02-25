import { Sidebar } from "@/components/dashboard/sidebar";
import { AIChatWidget } from "@/components/dashboard/ai-chat-widget";
import { DashboardOverlays } from "@/components/dashboard/dashboard-overlays";
import { AccountSetup } from "@/components/dashboard/account-setup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AccountSetup />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AIChatWidget />
      <DashboardOverlays />
    </div>
  );
}

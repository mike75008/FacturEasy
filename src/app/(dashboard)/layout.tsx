import { Sidebar } from "@/components/dashboard/sidebar";
import { AIChatWidget } from "@/components/dashboard/ai-chat-widget";
import { DashboardOverlays } from "@/components/dashboard/dashboard-overlays";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AIChatWidget />
      <DashboardOverlays />
    </div>
  );
}

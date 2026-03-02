import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardOverlays } from "@/components/dashboard/dashboard-overlays";
import { AccountSetup } from "@/components/dashboard/account-setup";
import { AppProvider } from "@/lib/context/app-context";
import {
  DeclarationGuardProvider,
  DeclarationBanner,
  DeclarationBlock,
} from "@/components/dashboard/declaration-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <DeclarationGuardProvider>
        <div className="flex min-h-screen">
          <AccountSetup />
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <DeclarationBanner />
            <DeclarationBlock>{children}</DeclarationBlock>
          </main>
          <DashboardOverlays />
        </div>
      </DeclarationGuardProvider>
    </AppProvider>
  );
}

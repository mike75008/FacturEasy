import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FacturePro - Facturation Intelligente",
  description:
    "Solution de facturation universelle avec IA intégrée pour tous les corps de métiers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-premium-gradient">
        {children}
      </body>
    </html>
  );
}

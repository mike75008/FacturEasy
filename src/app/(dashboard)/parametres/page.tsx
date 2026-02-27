"use client";

import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { Settings } from "lucide-react";

export default function ParametresPage() {
  return (
    <PageTransition>
      <Topbar title="Paramètres" subtitle="Réglages techniques de l'application" />
      <div className="p-6">
        <GlassCard hover={false} className="py-20">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6">
              <Settings className="w-10 h-10 text-gold-400/40" />
            </div>
            <h3 className="text-xl font-display font-semibold text-white mb-2">
              Paramètres
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40 max-w-md mx-auto">
              Les réglages techniques arriveront ici prochainement.
            </p>
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}

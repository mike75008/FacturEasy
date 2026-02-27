"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { cn } from "@/lib/utils";
import {
  User, CreditCard, Users, Plug, Database,
  Bell, Clock,
} from "lucide-react";

const SECTIONS = [
  { id: "compte",        label: "Compte",        icon: User,       subtitle: "Email, mot de passe, sécurité" },
  { id: "abonnement",    label: "Abonnement",    icon: CreditCard, subtitle: "Plan, limites, facturation" },
  { id: "equipe",        label: "Équipe",        icon: Users,      subtitle: "Collaborateurs et rôles" },
  { id: "notifications", label: "Notifications", icon: Bell,       subtitle: "Alertes email et rappels automatiques" },
  { id: "integrations",  label: "Intégrations",  icon: Plug,       subtitle: "Connexions externes et API" },
  { id: "donnees",       label: "Données",       icon: Database,   subtitle: "Export CSV/JSON, import de factures, suppression du compte" },
];

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gold-400/10 flex items-center justify-center mb-5">
        <Clock className="w-8 h-8 text-gold-400/40" />
      </div>
      <h4 className="text-lg font-display font-semibold text-white mb-2">{label}</h4>
      <p className="text-sm font-sans text-atlantic-200/40 max-w-xs">
        Cette section sera disponible prochainement.
      </p>
    </div>
  );
}

export default function ParametresPage() {
  const [active, setActive] = useState("compte");

  const activeSection = SECTIONS.find((s) => s.id === active)!;

  return (
    <PageTransition>
      <Topbar title="Paramètres" subtitle="Réglages techniques de l'application" />
      <div className="p-6">
        <GlassCard hover={false} className="!p-0 overflow-hidden">
          <div className="flex min-h-[480px]">

            {/* Menu latéral interne */}
            <div className="w-56 flex-shrink-0 border-r border-gold-400/10 p-3 space-y-1">
              {SECTIONS.map((section) => {
                const isActive = section.id === active;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActive(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-200",
                      isActive
                        ? "bg-gold-400/10 border border-gold-400/20 text-gold-400"
                        : "text-atlantic-200/50 hover:text-white hover:bg-atlantic-600/15"
                    )}
                  >
                    <section.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-sans font-medium">{section.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Contenu de la section */}
            <div className="flex-1 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                  <activeSection.icon className="w-5 h-5 text-gold-400" />
                  {activeSection.label}
                </h3>
                <p className="text-sm font-sans text-atlantic-200/40 mt-1">{activeSection.subtitle}</p>
              </div>
              <div className="border-t border-gold-400/10 pt-6">
                <ComingSoon label={activeSection.label} />
              </div>
            </div>

          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}

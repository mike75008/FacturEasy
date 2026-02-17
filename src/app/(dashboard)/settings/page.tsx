"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumInput } from "@/components/premium/premium-input";
import { PremiumButton } from "@/components/premium/premium-button";
import {
  Building2,
  CreditCard,
  FileDigit,
  Save,
  Upload,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"company" | "banking" | "numbering">("company");

  const tabs = [
    { id: "company" as const, label: "Entreprise", icon: Building2 },
    { id: "banking" as const, label: "Coordonnées bancaires", icon: CreditCard },
    { id: "numbering" as const, label: "Numérotation", icon: FileDigit },
  ];

  return (
    <div>
      <Topbar
        title="Paramètres"
        subtitle="Configuration de votre entreprise"
      />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-all ${
                activeTab === tab.id
                  ? "bg-gold-400/15 text-gold-400 border border-gold-400/30"
                  : "text-atlantic-200/60 hover:text-white hover:bg-atlantic-600/30"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeTab === "company" && (
            <PremiumCard>
              <h3 className="text-xl font-display font-semibold mb-6">
                Informations entreprise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PremiumInput label="Raison sociale" placeholder="Ma Société SAS" />
                <PremiumInput label="SIRET" placeholder="123 456 789 00012" />
                <PremiumInput label="N° TVA intracommunautaire" placeholder="FR12345678901" />
                <PremiumInput label="Forme juridique" placeholder="SAS, SARL, EI..." />
                <PremiumInput label="Capital social" placeholder="10 000 €" />
                <PremiumInput label="RCS" placeholder="Paris B 123 456 789" />
                <PremiumInput label="Adresse" placeholder="123 rue Example" className="md:col-span-2" />
                <PremiumInput label="Code postal" placeholder="75001" />
                <PremiumInput label="Ville" placeholder="Paris" />
                <PremiumInput label="Téléphone" placeholder="+33 1 23 45 67 89" />
                <PremiumInput label="Email" placeholder="contact@entreprise.fr" />
                <PremiumInput label="Site web" placeholder="https://entreprise.fr" />
              </div>

              <div className="mt-6 p-4 border border-dashed border-gold-400/30 rounded-lg text-center">
                <Upload className="w-8 h-8 text-gold-400/50 mx-auto mb-2" />
                <p className="text-sm font-sans text-atlantic-200/60">
                  Glissez votre logo ici ou cliquez pour parcourir
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <PremiumButton icon={<Save className="w-4 h-4" />}>
                  Enregistrer
                </PremiumButton>
              </div>
            </PremiumCard>
          )}

          {activeTab === "banking" && (
            <PremiumCard>
              <h3 className="text-xl font-display font-semibold mb-6">
                Coordonnées bancaires
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PremiumInput label="Banque" placeholder="Nom de la banque" />
                <PremiumInput label="IBAN" placeholder="FR76 1234 5678 9012 3456 7890 123" className="md:col-span-2" />
                <PremiumInput label="BIC/SWIFT" placeholder="BNPAFRPP" />
                <PremiumInput label="Délai de paiement par défaut (jours)" placeholder="30" type="number" />
              </div>
              <div className="mt-6 flex justify-end">
                <PremiumButton icon={<Save className="w-4 h-4" />}>
                  Enregistrer
                </PremiumButton>
              </div>
            </PremiumCard>
          )}

          {activeTab === "numbering" && (
            <PremiumCard>
              <h3 className="text-xl font-display font-semibold mb-6">
                Numérotation des documents
              </h3>
              <p className="text-sm font-sans text-atlantic-200/60 mb-6">
                La numérotation est séquentielle et sans trou, conformément à la
                législation française. Le format est : PREFIXE-ANNEE-NUMERO.
              </p>
              <div className="space-y-4">
                {[
                  { type: "Factures", prefix: "FAC", example: "FAC-2026-00001" },
                  { type: "Devis", prefix: "DEV", example: "DEV-2026-00001" },
                  { type: "Avoirs", prefix: "AVO", example: "AVO-2026-00001" },
                  { type: "Bons de livraison", prefix: "BL", example: "BL-2026-00001" },
                ].map((seq) => (
                  <div
                    key={seq.type}
                    className="flex items-center gap-4 p-3 rounded-lg bg-atlantic-800/30"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-sans font-medium text-white">
                        {seq.type}
                      </p>
                      <p className="text-xs font-sans text-atlantic-200/50">
                        Exemple : {seq.example}
                      </p>
                    </div>
                    <PremiumInput
                      placeholder={seq.prefix}
                      className="w-24 text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <PremiumButton icon={<Save className="w-4 h-4" />}>
                  Enregistrer
                </PremiumButton>
              </div>
            </PremiumCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}

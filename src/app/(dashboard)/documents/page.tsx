"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { FileText, Plus } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div>
      <Topbar title="Documents" subtitle="Factures, devis, avoirs" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex gap-3">
            <PremiumButton
              variant="outline"
              icon={<Plus className="w-4 h-4" />}
            >
              Nouveau devis
            </PremiumButton>
            <PremiumButton icon={<Plus className="w-4 h-4" />}>
              Nouvelle facture
            </PremiumButton>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard className="text-center py-16">
            <FileText className="w-16 h-16 text-gold-400/30 mx-auto mb-4" />
            <h3 className="text-xl font-display text-atlantic-200/60 mb-2">
              Aucun document
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40">
              Créez votre première facture ou devis
            </p>
          </PremiumCard>
        </motion.div>
      </div>
    </div>
  );
}

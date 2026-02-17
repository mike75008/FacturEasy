"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { Users, Plus } from "lucide-react";

export default function ClientsPage() {
  return (
    <div>
      <Topbar title="Clients" subtitle="Gérez votre portefeuille clients" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div />
          <PremiumButton icon={<Plus className="w-4 h-4" />}>
            Nouveau client
          </PremiumButton>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard className="text-center py-16">
            <Users className="w-16 h-16 text-gold-400/30 mx-auto mb-4" />
            <h3 className="text-xl font-display text-atlantic-200/60 mb-2">
              Aucun client
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40">
              Ajoutez votre premier client pour commencer
            </p>
          </PremiumCard>
        </motion.div>
      </div>
    </div>
  );
}

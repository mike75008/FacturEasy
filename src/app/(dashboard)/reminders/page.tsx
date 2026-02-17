"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumCard } from "@/components/premium/premium-card";
import { Bell } from "lucide-react";

export default function RemindersPage() {
  return (
    <div>
      <Topbar title="Relances" subtitle="Suivi et relances automatiques" />
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard className="text-center py-16">
            <Bell className="w-16 h-16 text-gold-400/30 mx-auto mb-4" />
            <h3 className="text-xl font-display text-atlantic-200/60 mb-2">
              Aucune relance
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40">
              Les relances automatiques apparaîtront ici
            </p>
          </PremiumCard>
        </motion.div>
      </div>
    </div>
  );
}

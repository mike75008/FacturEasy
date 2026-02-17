"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumCard } from "@/components/premium/premium-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { Package, Plus } from "lucide-react";

export default function ProductsPage() {
  return (
    <div>
      <Topbar title="Produits & Services" subtitle="Votre catalogue" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div />
          <PremiumButton icon={<Plus className="w-4 h-4" />}>
            Nouveau produit
          </PremiumButton>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard className="text-center py-16">
            <Package className="w-16 h-16 text-gold-400/30 mx-auto mb-4" />
            <h3 className="text-xl font-display text-atlantic-200/60 mb-2">
              Aucun produit
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40">
              Créez votre catalogue de produits et services
            </p>
          </PremiumCard>
        </motion.div>
      </div>
    </div>
  );
}

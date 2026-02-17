"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { PremiumCard } from "@/components/premium/premium-card";
import {
  FileText,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
} from "lucide-react";

const stats = [
  {
    label: "Chiffre d'affaires",
    value: "0 \u20ac",
    change: "+0%",
    icon: DollarSign,
    color: "text-green-400",
  },
  {
    label: "Factures en cours",
    value: "0",
    change: "0 en retard",
    icon: FileText,
    color: "text-gold-400",
  },
  {
    label: "Clients actifs",
    value: "0",
    change: "0 nouveaux",
    icon: Users,
    color: "text-blue-400",
  },
  {
    label: "Taux de paiement",
    value: "- %",
    change: "Aucune donnée",
    icon: TrendingUp,
    color: "text-emerald-400",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  return (
    <div>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activit\u00e9"
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <PremiumCard className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gold-400/10">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-sans text-atlantic-200/60">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-display font-bold text-white mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs font-sans text-atlantic-200/50 mt-1">
                    {stat.change}
                  </p>
                </div>
              </PremiumCard>
            </motion.div>
          ))}
        </motion.div>

        {/* ROI Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <PremiumCard glow className="flex items-center gap-6">
            <div className="p-4 rounded-xl bg-gold-gradient">
              <DollarSign className="w-10 h-10 text-atlantic-900" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-display font-semibold text-white">
                ROI FacturePro
              </h3>
              <p className="text-sm font-sans text-atlantic-200/60 mt-1">
                Commencez \u00e0 cr\u00e9er des factures pour voir votre retour sur investissement
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-bold gold-text">0 \u20ac</p>
              <p className="text-xs font-sans text-atlantic-200/50">
                temps \u00e9conomis\u00e9
              </p>
            </div>
          </PremiumCard>
        </motion.div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <PremiumCard>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gold-400" />
                <h3 className="text-lg font-display font-semibold">
                  Activit\u00e9 r\u00e9cente
                </h3>
              </div>
              <div className="text-center py-8 text-atlantic-200/40 font-sans text-sm">
                Aucune activit\u00e9 pour le moment
              </div>
            </PremiumCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <PremiumCard>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-gold-400" />
                <h3 className="text-lg font-display font-semibold">Alertes</h3>
              </div>
              <div className="text-center py-8 text-atlantic-200/40 font-sans text-sm">
                Aucune alerte
              </div>
            </PremiumCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

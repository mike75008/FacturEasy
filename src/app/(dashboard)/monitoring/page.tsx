"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { Activity, ShieldCheck, AlertTriangle, Eye } from "lucide-react";

export default function MonitoringPage() {
  return (
    <PageTransition>
      <Topbar title="Monitoring" subtitle="Surveillance prédictive et alertes" />
      <div className="p-6">
        {/* Status bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-emerald-400/[0.06] border border-emerald-400/15 mb-6"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </motion.div>
          <div>
            <p className="text-sm font-sans font-medium text-emerald-400">Système opérationnel</p>
            <p className="text-xs font-sans text-atlantic-200/40">Aucune anomalie détectée - Dernière vérification : il y a 5 min</p>
          </div>
        </motion.div>

        <GlassCard hover={false} className="py-16">
          <div className="text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block"
            >
              <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-gold-400/40" />
              </div>
            </motion.div>
            <h3 className="text-xl font-display font-semibold text-white mb-2">
              Monitoring prédictif
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40 max-w-md mx-auto mb-8">
              L&apos;IA surveille en continu vos factures et détecte automatiquement
              les anomalies, doublons et comportements à risque.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
              {[
                { icon: AlertTriangle, label: "Anomalies", desc: "Montants inhabituels", color: "text-amber-400" },
                { icon: Eye, label: "Surveillance", desc: "24/7 automatique", color: "text-blue-400" },
                { icon: Activity, label: "Prédictif", desc: "Alertes avant retard", color: "text-violet-400" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/5"
                >
                  <item.icon className={`w-6 h-6 ${item.color} mx-auto mb-2`} />
                  <p className="text-xs font-sans font-medium text-atlantic-200/60">{item.label}</p>
                  <p className="text-[10px] font-sans text-atlantic-200/30">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}

"use client";

import { motion } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { Bell, Brain, Mail, Phone, Sparkles } from "lucide-react";

export default function RemindersPage() {
  return (
    <PageTransition>
      <Topbar title="Relances" subtitle="Suivi et relances automatiques IA" />
      <div className="p-6">
        <GlassCard hover={false} className="py-20">
          <div className="text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block"
            >
              <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6 relative">
                <Bell className="w-10 h-10 text-gold-400/40" />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl bg-gold-400/10"
                />
              </div>
            </motion.div>
            <h3 className="text-xl font-display font-semibold text-white mb-2">
              Relances intelligentes
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40 max-w-md mx-auto mb-8">
              L&apos;IA génère et envoie automatiquement des relances adaptées
              au profil de chaque client et à son historique de paiement.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
              {[
                { icon: Mail, label: "Email", desc: "Relances personnalisées", color: "text-blue-400" },
                { icon: Phone, label: "SMS", desc: "Rappels courts", color: "text-emerald-400" },
                { icon: Brain, label: "IA adaptative", desc: "Ton ajusté au contexte", color: "text-gold-400" },
              ].map((ch, i) => (
                <motion.div
                  key={ch.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/5"
                >
                  <ch.icon className={`w-6 h-6 ${ch.color} mx-auto mb-2`} />
                  <p className="text-xs font-sans font-medium text-atlantic-200/60">{ch.label}</p>
                  <p className="text-[10px] font-sans text-atlantic-200/30">{ch.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}

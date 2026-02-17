"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/premium/logo";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { FileText, Users, Brain, Shield } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: FileText,
    title: "Facturation Universelle",
    description: "Devis, factures, avoirs pour tous les métiers avec numérotation légale",
  },
  {
    icon: Users,
    title: "Gestion Clients",
    description: "CRM intégré avec scoring, gamification et suivi comportemental",
  },
  {
    icon: Brain,
    title: "IA Intégrée",
    description: "Relances intelligentes, détection d'anomalies et optimisation automatique",
  },
  {
    icon: Shield,
    title: "Double Contrôle",
    description: "Validation N+1, audit trail complet et conformité légale française",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <Logo size="lg" className="mb-6" />
        <p className="text-xl text-atlantic-200/80 font-body max-w-2xl mx-auto mt-4">
          La solution de facturation premium avec intelligence artificielle
          pour tous les professionnels
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/register">
            <PremiumButton size="lg">Commencer gratuitement</PremiumButton>
          </Link>
          <Link href="/login">
            <PremiumButton variant="outline" size="lg">
              Se connecter
            </PremiumButton>
          </Link>
        </div>
        <div className="mt-4">
          <Link href="/dashboard">
            <PremiumButton variant="ghost" size="sm">
              Accéder à la démo →
            </PremiumButton>
          </Link>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full"
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={item}>
            <PremiumCard className="h-full text-center">
              <feature.icon className="w-10 h-10 text-gold-400 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-atlantic-200/70 font-sans">
                {feature.description}
              </p>
            </PremiumCard>
          </motion.div>
        ))}
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-20 text-center text-atlantic-200/40 text-sm font-sans"
      >
        <p>&copy; 2026 FacturePro. Tous droits réservés.</p>
      </motion.footer>
    </div>
  );
}

"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  FileText, Users, Brain, Shield, Zap, TrendingUp,
  CheckCircle2, ArrowRight, Star, BarChart3, Bell,
  Lock, Sparkles, ChevronDown,
} from "lucide-react";
import { AnimatedBackground } from "@/components/premium/animated-background";
import { GlassCard } from "@/components/premium/glass-card";
import { SectionHeading } from "@/components/premium/section-heading";
import { AnimatedCounter } from "@/components/premium/animated-counter";
import { FloatingParticles } from "@/components/premium/floating-particles";
import { PremiumButton } from "@/components/premium/premium-button";

/* ─── DATA ─── */
const features = [
  { icon: FileText, title: "Facturation Universelle", desc: "Devis, factures, avoirs, bons de livraison avec numérotation séquentielle légale sans faille." },
  { icon: Users, title: "CRM Intégré", desc: "Gestion clients avec scoring comportemental, badges de fidélité et timeline d'interactions." },
  { icon: Brain, title: "Intelligence Artificielle", desc: "Relances auto-générées, détection d'anomalies, optimisation de factures et assistant conversationnel." },
  { icon: Shield, title: "Double Contrôle", desc: "Validation N+1 obligatoire, audit trail complet, conformité totale législation française." },
  { icon: Zap, title: "Automatisation Totale", desc: "Relances programmées, alertes prédictives, pré-remplissage intelligent et suggestions IA." },
  { icon: BarChart3, title: "Dashboard Temps Réel", desc: "KPIs animés, graphiques CA, monitoring prédictif et widget ROI en temps réel." },
];

const stats = [
  { value: 99.9, suffix: "%", label: "Disponibilité", decimals: 1 },
  { value: 0, suffix: "", label: "Doublon de numérotation", decimals: 0 },
  { value: 5, suffix: "s", label: "Génération PDF", decimals: 0 },
  { value: 100, suffix: "%", label: "Conforme législation FR", decimals: 0 },
];

const workflow = [
  { step: "01", title: "Créez", desc: "Ajoutez vos clients et votre catalogue en quelques clics", icon: Users },
  { step: "02", title: "Facturez", desc: "Générez devis et factures avec calcul TVA automatique", icon: FileText },
  { step: "03", title: "Validez", desc: "Double contrôle N+1 et vérification IA des anomalies", icon: CheckCircle2 },
  { step: "04", title: "Encaissez", desc: "Suivi des paiements, relances intelligentes automatiques", icon: TrendingUp },
];

const testimonials = [
  { name: "Marie Dubois", role: "Architecte d'intérieur", text: "FacturePro a transformé ma gestion. Les relances IA me font gagner 3h par semaine.", rating: 5 },
  { name: "Thomas Laurent", role: "Consultant IT", text: "La conformité légale automatique m'enlève un poids énorme. Plus besoin de vérifier chaque mention.", rating: 5 },
  { name: "Sophie Martin", role: "Artisan plombier", text: "Enfin un outil qui comprend mon métier. Les unités personnalisables changent tout.", rating: 5 },
];

/* ─── COMPONENT ─── */
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="relative">
      <AnimatedBackground />

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <FloatingParticles count={30} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="text-center max-w-5xl mx-auto relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold-400/10 border border-gold-400/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-sm font-sans font-medium text-gold-400">
              Propulsé par l&apos;Intelligence Artificielle
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] mb-6"
          >
            La facturation
            <br />
            <span className="animated-gold-text">haut de gamme</span>
            <br />
            pour les professionnels
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-atlantic-200/70 font-body max-w-3xl mx-auto mb-10"
          >
            Solution tout-en-un avec IA intégrée, conformité légale française automatique
            et design premium pour une expérience sans compromis.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/register">
              <PremiumButton size="lg" icon={<Zap className="w-5 h-5" />}>
                Démarrer gratuitement
              </PremiumButton>
            </Link>
            <Link href="/dashboard">
              <PremiumButton variant="outline" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Explorer la démo
              </PremiumButton>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex items-center justify-center gap-6 mt-10 text-atlantic-200/40 text-xs font-sans"
          >
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Données chiffrées</span>
            <span className="w-1 h-1 rounded-full bg-gold-400/30" />
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Conforme NF525</span>
            <span className="w-1 h-1 rounded-full bg-gold-400/30" />
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Setup en 2 min</span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6 text-gold-400/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative py-16 border-y border-gold-400/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-display font-bold gold-text mb-2">
                  <AnimatedCounter
                    target={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </div>
                <p className="text-sm font-sans text-atlantic-200/50">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            badge="Fonctionnalités"
            title="Tout ce dont vous avez besoin,"
            titleGold="rien de superflu"
            subtitle="Une suite complète d'outils pensée pour les professionnels exigeants qui veulent le meilleur."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {features.map((f, i) => (
              <GlassCard key={f.title} delay={i * 0.1} className="group">
                <div className="p-3 rounded-xl bg-gold-400/10 w-fit mb-4 group-hover:bg-gold-400/20 transition-colors duration-300">
                  <f.icon className="w-6 h-6 text-gold-400" />
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-sm font-sans text-atlantic-200/60 leading-relaxed">
                  {f.desc}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WORKFLOW ═══ */}
      <section className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            badge="Comment ça marche"
            title="Simple comme"
            titleGold="1, 2, 3, 4"
            subtitle="De la création à l'encaissement, un parcours fluide et automatisé."
          />

          <div className="mt-16 space-y-6">
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-6 p-6 rounded-xl border border-gold-400/10 bg-atlantic-800/20 backdrop-blur-sm hover:border-gold-400/30 hover:bg-atlantic-800/30 transition-all duration-500 group"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-premium">
                  <span className="text-2xl font-display font-bold text-atlantic-900">{w.step}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-display font-semibold text-white group-hover:text-gold-300 transition-colors">
                    {w.title}
                  </h3>
                  <p className="text-sm font-sans text-atlantic-200/60 mt-1">{w.desc}</p>
                </div>
                <w.icon className="w-8 h-8 text-gold-400/30 group-hover:text-gold-400/60 transition-colors flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            badge="Témoignages"
            title="Ils nous font"
            titleGold="confiance"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {testimonials.map((t, i) => (
              <GlassCard key={t.name} delay={i * 0.15} className="flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="text-atlantic-200/80 font-body text-base leading-relaxed flex-1 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-4 pt-4 border-t border-gold-400/10">
                  <p className="font-sans font-semibold text-white text-sm">{t.name}</p>
                  <p className="font-sans text-atlantic-200/50 text-xs">{t.role}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center relative">
          <FloatingParticles count={15} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative z-10 p-12 rounded-2xl border border-gold-400/20 bg-atlantic-800/30 backdrop-blur-xl shadow-premium-glow"
          >
            <Bell className="w-12 h-12 text-gold-400 mx-auto mb-6 animate-float" />
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Prêt à <span className="animated-gold-text">transformer</span>
              <br />votre facturation ?
            </h2>
            <p className="text-lg text-atlantic-200/60 font-body mb-8 max-w-2xl mx-auto">
              Rejoignez les professionnels qui ont choisi l&apos;excellence.
              Configuration en 2 minutes, aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <PremiumButton size="lg" icon={<Sparkles className="w-5 h-5" />}>
                  Créer mon compte gratuit
                </PremiumButton>
              </Link>
              <Link href="/dashboard">
                <PremiumButton variant="outline" size="lg">
                  Voir la démo en direct
                </PremiumButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-gold-400/10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-display text-2xl font-bold mb-2">
                <span className="gold-text">Facture</span><span className="text-white">Pro</span>
              </h3>
              <p className="text-sm font-sans text-atlantic-200/50">
                Facturation intelligente pour professionnels exigeants.
              </p>
            </div>
            <div>
              <h4 className="font-sans font-semibold text-gold-400/80 text-sm mb-3 uppercase tracking-wider">Produit</h4>
              <ul className="space-y-2 text-sm font-sans text-atlantic-200/50">
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Fonctionnalités</li>
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Tarifs</li>
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Sécurité</li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans font-semibold text-gold-400/80 text-sm mb-3 uppercase tracking-wider">Ressources</h4>
              <ul className="space-y-2 text-sm font-sans text-atlantic-200/50">
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Documentation</li>
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Guide TVA</li>
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Blog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans font-semibold text-gold-400/80 text-sm mb-3 uppercase tracking-wider">Légal</h4>
              <ul className="space-y-2 text-sm font-sans text-atlantic-200/50">
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">CGU</li>
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Confidentialité</li>
                <li className="hover:text-gold-400/80 transition-colors cursor-pointer">Mentions légales</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gold-400/10 pt-8 text-center text-atlantic-200/30 text-xs font-sans">
            <p>&copy; 2026 FacturePro. Tous droits réservés. Conçu avec excellence en France.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

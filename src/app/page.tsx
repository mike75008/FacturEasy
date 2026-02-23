"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileText, Users, Brain, Shield, Zap, TrendingUp,
  CheckCircle2, ArrowRight, Star, BarChart3, Bell,
  Lock, Sparkles, ChevronDown, User, Building2, Building,
  Briefcase, Heart, Code2, HardHat, ShoppingBag, Wallet, Settings,
} from "lucide-react";
import { AnimatedBackground } from "@/components/premium/animated-background";
import { GlassCard } from "@/components/premium/glass-card";
import { SectionHeading } from "@/components/premium/section-heading";
import { AnimatedCounter } from "@/components/premium/animated-counter";
import { FloatingParticles } from "@/components/premium/floating-particles";
import { PremiumButton } from "@/components/premium/premium-button";

const NAV_ITEMS = [
  {
    label: "Profils",
    items: [
      { label: "Freelance", icon: User },
      { label: "TPE (1-9 salariés)", icon: Building2 },
      { label: "PME (10-250 salariés)", icon: Building },
      { label: "Agence", icon: Briefcase },
      { label: "Association", icon: Heart },
      { label: "Autre", icon: Sparkles },
    ],
  },
  {
    label: "Activités",
    items: [
      { label: "Services & Conseil", icon: Briefcase },
      { label: "Commerce & Vente", icon: ShoppingBag },
      { label: "Bâtiment & Artisanat", icon: HardHat },
      { label: "Santé & Bien-être", icon: Heart },
      { label: "Digital & Tech", icon: Code2 },
      { label: "Autre", icon: Sparkles },
    ],
  },
  {
    label: "Priorités",
    items: [
      { label: "Créer ma première facture", icon: FileText },
      { label: "Gérer mes clients", icon: Users },
      { label: "Suivre mes paiements", icon: TrendingUp },
      { label: "Voir mes finances", icon: Wallet },
      { label: "Configurer mon entreprise", icon: Settings },
    ],
  },
  { label: "Produits", items: [] },
  { label: "Tarifs", items: [] },
  { label: "À propos", items: [] },
  { label: "Contact", items: [] },
];

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

export default function HomePage() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeMenu]);

  return (
    <div className="relative">
      <AnimatedBackground />

      {/* ═══ NAVBAR ═══ */}
      <nav
        ref={navRef}
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-gold-400/10 bg-atlantic-900/80 backdrop-blur-xl"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shadow-premium">
            <Sparkles className="w-4 h-4 text-atlantic-900" />
          </div>
          <span className="text-lg font-display font-bold">
            <span className="animated-gold-text">Facture</span>
            <span className="text-white">Pro</span>
          </span>
        </Link>

        {/* Menu items */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((nav) => (
            <div key={nav.label} className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === nav.label ? null : nav.label)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-sans transition-all duration-200 ${
                  openMenu === nav.label
                    ? "text-gold-400 bg-gold-400/10"
                    : "text-atlantic-200/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {nav.label}
                {nav.items.length > 0 && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      openMenu === nav.label ? "rotate-180 text-gold-400" : ""
                    }`}
                  />
                )}
              </button>

              {/* Dropdown */}
              {openMenu === nav.label && nav.items.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-xl border border-gold-400/10 bg-atlantic-900/98 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
                  {nav.items.map((item) => (
                    <button
                      key={item.label}
                      onClick={closeMenu}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-sans text-atlantic-200/70 hover:text-white hover:bg-gold-400/5 transition-all text-left border-b border-gold-400/5 last:border-0"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-3.5 h-3.5 text-gold-400" />
                      </div>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="px-4 py-2 rounded-lg text-sm font-sans text-atlantic-200/60 hover:text-white hover:bg-white/5 transition-all">
              Explorer la démo
            </button>
          </Link>
          <Link href="/login">
            <PremiumButton size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              Se connecter
            </PremiumButton>
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <FloatingParticles count={30} />

        <div className="text-center max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold-400/10 border border-gold-400/20 mb-8">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-sm font-sans font-medium text-gold-400">
              Propulsé par l&apos;Intelligence Artificielle
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] mb-6">
            La facturation
            <br />
            <span className="animated-gold-text">haut de gamme</span>
            <br />
            pour les professionnels
          </h1>

          <p className="text-xl md:text-2xl text-atlantic-200/70 font-body max-w-3xl mx-auto mb-10">
            Solution tout-en-un avec IA intégrée, conformité légale française automatique
            et design premium pour une expérience sans compromis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard">
              <PremiumButton size="lg" icon={<Zap className="w-5 h-5" />}>
                Démarrer gratuitement
              </PremiumButton>
            </Link>
            <Link href="/login">
              <PremiumButton variant="outline" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Se connecter
              </PremiumButton>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-10 text-atlantic-200/40 text-xs font-sans">
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Données chiffrées</span>
            <span className="w-1 h-1 rounded-full bg-gold-400/30" />
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Conforme NF525</span>
            <span className="w-1 h-1 rounded-full bg-gold-400/30" />
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Setup en 2 min</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gold-400/40" />
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative py-16 border-y border-gold-400/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-display font-bold gold-text mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </div>
                <p className="text-sm font-sans text-atlantic-200/50">{stat.label}</p>
              </div>
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
            {features.map((f) => (
              <GlassCard key={f.title} className="group">
                <div className="p-3 rounded-xl bg-gold-400/10 w-fit mb-4 group-hover:bg-gold-400/20 transition-colors duration-300">
                  <f.icon className="w-6 h-6 text-gold-400" />
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm font-sans text-atlantic-200/60 leading-relaxed">{f.desc}</p>
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
            {workflow.map((w) => (
              <div
                key={w.step}
                className="flex items-center gap-6 p-6 rounded-xl border border-gold-400/10 bg-atlantic-800/20 backdrop-blur-sm hover:border-gold-400/30 hover:bg-atlantic-800/30 transition-all duration-500 group"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-premium">
                  <span className="text-2xl font-display font-bold text-atlantic-900">{w.step}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-display font-semibold text-white group-hover:text-gold-300 transition-colors">{w.title}</h3>
                  <p className="text-sm font-sans text-atlantic-200/60 mt-1">{w.desc}</p>
                </div>
                <w.icon className="w-8 h-8 text-gold-400/30 group-hover:text-gold-400/60 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading badge="Témoignages" title="Ils nous font" titleGold="confiance" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {testimonials.map((t) => (
              <GlassCard key={t.name} className="flex flex-col">
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
          <div className="relative z-10 p-12 rounded-2xl border border-gold-400/20 bg-atlantic-800/30 backdrop-blur-xl shadow-premium-glow">
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
              <Link href="/dashboard">
                <PremiumButton size="lg" icon={<Sparkles className="w-5 h-5" />}>
                  Démarrer gratuitement
                </PremiumButton>
              </Link>
              <Link href="/login">
                <PremiumButton variant="outline" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                  Se connecter
                </PremiumButton>
              </Link>
            </div>
          </div>
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
              <p className="text-sm font-sans text-atlantic-200/50">Facturation intelligente pour professionnels exigeants.</p>
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

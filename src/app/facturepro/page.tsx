"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles, ChevronDown, User, Building2, Building, Briefcase,
  Heart, Code2, HardHat, ShoppingBag, FileText, Users, TrendingUp,
  Wallet, Settings, Zap, ArrowRight,
} from "lucide-react";
import { AnimatedBackground } from "@/components/premium/animated-background";
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

export default function WelcomePage() {
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
    <div className="relative min-h-screen">
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
          <span className="text-lg font-display font-bold text-white group-hover:text-gold-400 transition-colors">
            FacturePro
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
                <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-gold-400/10 bg-atlantic-900/98 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
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

        {/* CTA buttons */}
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
      <section className="relative flex flex-col items-center justify-center px-4 pt-32 pb-24">
        <FloatingParticles count={20} />

        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gold-400/10 border border-gold-400/20 mb-8">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-sm font-sans font-medium text-gold-400">
              Choisissez votre profil et commencez
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-display font-bold leading-[1.1] mb-6">
            FacturePro s&apos;adapte
            <br />
            <span className="animated-gold-text">à votre activité</span>
          </h1>

          <p className="text-lg md:text-xl text-atlantic-200/60 font-body max-w-2xl mx-auto mb-10">
            Freelance, TPE, PME ou agence — explorez les menus ci-dessus pour découvrir
            ce que FacturePro peut faire pour vous.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard">
              <PremiumButton size="lg" icon={<Zap className="w-5 h-5" />}>
                Explorer la démo
              </PremiumButton>
            </Link>
            <Link href="/login">
              <PremiumButton variant="outline" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Se connecter
              </PremiumButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

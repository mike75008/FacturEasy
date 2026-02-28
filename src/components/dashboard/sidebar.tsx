"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Package, FileText, Settings, Bell,
  Activity, Brain, ChevronLeft, LogOut,
  Menu, X, UserCircle,
} from "lucide-react";
import { useAppContext } from "@/lib/context/app-context";
import { computeInsights, filterUnseen } from "@/lib/insights";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/products", label: "Produits", icon: Package },
  { href: "/reminders", label: "Relances", icon: Bell },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/assistant", label: "Assistant IA", icon: Brain },
  { href: "/settings", label: "Profil", icon: UserCircle },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

// Spring easing — dépasse légèrement puis se pose, c'est ça la grâce
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const SMOOTH = "cubic-bezier(0.16, 1, 0.3, 1)";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { documents, clients } = useAppContext();
  const [insightCount, setInsightCount] = useState(0);

  useEffect(() => {
    if (!documents.length && !clients.length) return;
    const all = computeInsights(documents, clients);
    const unseen = filterUnseen(all);
    setInsightCount(unseen.length);
  }, [documents, clients]);

  // Refs pour mesurer les positions réelles des items
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number; rapid: boolean } | null>(null);
  const isFirstRender = useRef(true);
  const lastNavTime = useRef(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const activeIndex = navItems.findIndex(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname?.startsWith(item.href))
  );

  // Mise à jour du pill — détecte la navigation rapide pour éviter le spring chaotique
  useEffect(() => {
    if (activeIndex < 0) {
      setPillStyle(null);
      return;
    }
    const now = Date.now();
    const rapid = now - lastNavTime.current < 300;
    lastNavTime.current = now;

    const raf = requestAnimationFrame(() => {
      const el = itemRefs.current[activeIndex];
      if (!el) return;
      setPillStyle({ top: el.offsetTop, height: el.offsetHeight, rapid });
      isFirstRender.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [activeIndex]);

  const showLabels = !collapsed;

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gold-400/10 flex items-center justify-between min-h-[72px] overflow-hidden">
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            showLabels || isMobile ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0"
          )}
          style={{ transitionTimingFunction: SMOOTH }}
        >
          <Link href="/">
            <h1 className="font-display text-xl font-bold whitespace-nowrap">
              <span className="animated-gold-text">Factur</span>
              <span className="text-white">Easy</span>
            </h1>
          </Link>
        </div>
        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="text-atlantic-200/40 hover:text-gold-400 transition-colors p-1.5 rounded-lg hover:bg-gold-400/10"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex text-atlantic-200/40 hover:text-gold-400 transition-colors duration-200 p-1.5 rounded-lg hover:bg-gold-400/10"
          >
            <div
              style={{
                transition: `transform 0.35s ${SPRING}`,
                transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="relative space-y-1">

          {/* Pill glissant — le cœur de la fluidité */}
          {pillStyle && (
            <div
              className="absolute left-0 right-0 rounded-xl bg-gold-400/[0.08] border border-gold-400/20 pointer-events-none"
              style={{
                top: pillStyle.top,
                height: pillStyle.height,
                transition: isFirstRender.current || pillStyle.rapid
                  ? "none"
                  : `top 0.4s ${SPRING}, height 0.25s ${SMOOTH}, opacity 0.2s ease`,
                opacity: pillStyle ? 1 : 0,
              }}
            />
          )}

          {navItems.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  ref={(el) => { itemRefs.current[index] = el; }}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "transition-colors duration-200",
                    isActive
                      ? "text-gold-400"
                      : "text-atlantic-200/50 hover:text-white hover:bg-atlantic-600/15"
                  )}
                >
                  {/* Barre gauche — fondu subtil, pas de pop */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-gold-gradient"
                    style={{
                      height: isActive ? "20px" : "0px",
                      opacity: isActive ? 1 : 0,
                      transition: `height 0.35s ${SPRING}, opacity 0.2s ease`,
                    }}
                  />

                  <div className="relative flex-shrink-0">
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-colors duration-200",
                        isActive ? "text-gold-400" : ""
                      )}
                    />
                    {item.href === "/assistant" && insightCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 flex items-center justify-center text-[8px] font-bold text-white animate-pulse">
                        {insightCount > 9 ? "9+" : insightCount}
                      </span>
                    )}
                  </div>

                  <span
                    className="text-sm font-sans font-medium whitespace-nowrap overflow-hidden"
                    style={{
                      maxWidth: showLabels || isMobile ? "160px" : "0px",
                      opacity: showLabels || isMobile ? 1 : 0,
                      transition: `max-width 0.3s ${SMOOTH}, opacity 0.2s ease`,
                    }}
                  >
                    {item.label}
                    {item.href === "/assistant" && insightCount > 0 && (showLabels || isMobile) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-400/20 text-red-300">
                        {insightCount} alerte{insightCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gold-400/10">
        <button
          onClick={async () => {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full",
            "text-atlantic-200/40 hover:text-red-400 hover:bg-red-400/10",
            "transition-colors duration-200",
            !showLabels && !isMobile && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span
            className="text-sm font-sans whitespace-nowrap overflow-hidden"
            style={{
              maxWidth: showLabels || isMobile ? "160px" : "0px",
              opacity: showLabels || isMobile ? 1 : 0,
              transition: `max-width 0.3s ${SMOOTH}, opacity 0.2s ease`,
            }}
          >
            Déconnexion
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-atlantic-900/80 backdrop-blur-xl border border-gold-400/20 text-gold-400 hover:bg-atlantic-800/80 transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay — toujours monté, fade CSS */}
      <div
        onClick={() => setMobileOpen(false)}
        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        style={{
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: `opacity 0.3s ${SMOOTH}`,
        }}
      />

      {/* Mobile sidebar — toujours monté, slide CSS */}
      <aside
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-atlantic-900/95 backdrop-blur-xl border-r border-gold-400/10"
        style={{
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: `transform 0.35s ${mobileOpen ? SMOOTH : "cubic-bezier(0.4, 0, 1, 1)"}`,
        }}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex h-screen sticky top-0 flex-col bg-atlantic-900/60 backdrop-blur-xl border-r border-gold-400/10 overflow-hidden"
        style={{
          width: collapsed ? 80 : 260,
          transition: `width 0.35s ${SMOOTH}`,
        }}
      >
        {sidebarContent(false)}
      </aside>
    </>
  );
}

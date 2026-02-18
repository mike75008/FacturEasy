"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  Bell,
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/products", label: "Produits", icon: Package },
  { href: "/reminders", label: "Relances", icon: Bell },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = navItems.findIndex(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname?.startsWith(item.href))
  );

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0, width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen sticky top-0 flex flex-col bg-atlantic-900/60 backdrop-blur-xl border-r border-gold-400/10 overflow-hidden"
    >
      {/* Logo */}
      <div className="p-5 border-b border-gold-400/10 flex items-center justify-between min-h-[72px]">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Link href="/">
                <h1 className="font-display text-xl font-bold">
                  <span className="animated-gold-text">Facture</span>
                  <span className="text-white">Pro</span>
                </h1>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          className="text-atlantic-200/40 hover:text-gold-400 transition-colors p-1.5 rounded-lg hover:bg-gold-400/10"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto relative">
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          const isHovered = index === hoveredIndex;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
                  isActive
                    ? "text-gold-400"
                    : "text-atlantic-200/50 hover:text-white"
                )}
              >
                {/* Active/hover background */}
                {(isActive || isHovered) && (
                  <motion.div
                    layoutId={isActive ? "sidebar-active" : undefined}
                    className={cn(
                      "absolute inset-0 rounded-xl",
                      isActive
                        ? "bg-gold-400/[0.08] border border-gold-400/20"
                        : "bg-atlantic-600/20"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Active gold bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold-gradient rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <item.icon className={cn("w-5 h-5 flex-shrink-0 relative z-10 transition-colors duration-200", isActive && "text-gold-400")} />

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-sans font-medium whitespace-nowrap relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant */}
      <div className="px-3 py-2">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer",
            "bg-gradient-to-r from-gold-400/[0.08] to-atlantic-600/20",
            "border border-gold-400/15 hover:border-gold-400/30",
            "transition-all duration-300",
            collapsed && "justify-center"
          )}
        >
          <div className="relative flex-shrink-0">
            <Brain className="w-5 h-5 text-gold-400" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-gold-400/30"
            />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-sans font-semibold text-gold-400">Assistant IA</p>
              <p className="text-[10px] font-sans text-atlantic-200/40">En ligne</p>
            </div>
          )}
          {!collapsed && <Sparkles className="w-3.5 h-3.5 text-gold-400/50" />}
        </motion.div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-gold-400/10">
        <motion.button
          whileHover={{ x: 4 }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full",
            "text-atlantic-200/40 hover:text-red-400 hover:bg-red-400/10",
            "transition-all duration-300",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-sans">Déconnexion</span>}
        </motion.button>
      </div>
    </motion.aside>
  );
}

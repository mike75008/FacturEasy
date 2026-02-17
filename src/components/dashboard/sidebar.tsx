"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/premium/logo";
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-gold-400/20 bg-atlantic-800/50 backdrop-blur-md transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gold-400/20 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Logo size="sm" />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gold-400/50 hover:text-gold-400 transition-colors p-1"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-gold-400/15 text-gold-400 border border-gold-400/30"
                    : "text-atlantic-200/60 hover:text-white hover:bg-atlantic-600/30"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive ? "text-gold-400" : "text-atlantic-200/50 group-hover:text-gold-400/70"
                  )}
                />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-sans font-medium whitespace-nowrap overflow-hidden"
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

      {/* AI Assistant indicator */}
      <div className="px-2 py-2">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gold-400/10 border border-gold-400/20",
            collapsed && "justify-center"
          )}
        >
          <Brain className="w-5 h-5 text-gold-400 animate-pulse flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs font-sans text-gold-400/80">
              IA Active
            </span>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="p-2 border-t border-gold-400/20">
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-atlantic-200/50 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 w-full",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-sans">Déconnexion</span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

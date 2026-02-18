"use client";

import { motion } from "framer-motion";
import { Bell, Search, MessageSquare, Sparkles } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gold-400/10 bg-atlantic-900/40 backdrop-blur-xl"
    >
      <div>
        <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm font-sans text-atlantic-200/40 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-300"
        >
          <Search className="w-5 h-5" />
        </motion.button>

        {/* AI Chat */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-300 relative"
        >
          <MessageSquare className="w-5 h-5" />
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full"
          />
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 rounded-xl text-atlantic-200/40 hover:text-gold-400 hover:bg-gold-400/10 transition-all duration-300 relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
        </motion.button>

        {/* Separator */}
        <div className="w-px h-8 bg-gold-400/10 mx-1" />

        {/* User */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gold-400/5 transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center text-atlantic-900 font-sans font-bold text-sm shadow-premium">
            U
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-sans font-medium text-white">Utilisateur</p>
            <p className="text-[10px] font-sans text-atlantic-200/40">Propriétaire</p>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}

"use client";

import { motion } from "framer-motion";
import { Bell, Search, MessageSquare } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gold-400/20 bg-atlantic-700/80 backdrop-blur-md"
    >
      <div>
        <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm font-sans text-atlantic-200/60 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="p-2 rounded-lg text-atlantic-200/50 hover:text-gold-400 hover:bg-gold-400/10 transition-all">
          <Search className="w-5 h-5" />
        </button>

        {/* AI Chat */}
        <button className="p-2 rounded-lg text-atlantic-200/50 hover:text-gold-400 hover:bg-gold-400/10 transition-all relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-gold-400 rounded-full" />
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-atlantic-200/50 hover:text-gold-400 hover:bg-gold-400/10 transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
        </button>

        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center text-atlantic-900 font-sans font-bold text-sm ml-2">
          U
        </div>
      </div>
    </motion.header>
  );
}

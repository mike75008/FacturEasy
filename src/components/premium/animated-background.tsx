"use client";

import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-atlantic-900 via-atlantic-700 to-atlantic-800" />

      {/* Animated orbs */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, 60, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-gold-400/[0.03] blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 100, -60, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-atlantic-400/[0.05] blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, 60, -100, 0],
          y: [0, -40, 80, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-gold-400/[0.02] blur-[80px]"
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-atlantic-900/50" />
    </div>
  );
}

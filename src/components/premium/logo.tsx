"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      <h1 className={`font-display font-bold ${sizes[size]}`}>
        <span className="gold-text">Facture</span>
        <span className="text-white">Pro</span>
      </h1>
      <p className="text-atlantic-200/60 text-sm font-sans tracking-wider uppercase">
        Facturation Intelligente
      </p>
    </motion.div>
  );
}

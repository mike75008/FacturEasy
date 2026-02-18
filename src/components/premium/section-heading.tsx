"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  titleGold?: string;
  subtitle?: string;
  className?: string;
  align?: "center" | "left";
}

export function SectionHeading({
  badge,
  title,
  titleGold,
  subtitle,
  className,
  align = "center",
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        align === "center" && "text-center",
        className
      )}
    >
      {badge && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1.5 rounded-full text-xs font-sans font-semibold tracking-widest uppercase bg-gold-400/10 text-gold-400 border border-gold-400/20 mb-4"
        >
          {badge}
        </motion.span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
        {title}{" "}
        {titleGold && <span className="gold-text">{titleGold}</span>}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-atlantic-200/60 font-body max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
}

export function GlassCard({
  children,
  className,
  hover = true,
  glow = false,
  delay = 0,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        hover
          ? {
              y: -4,
              transition: { duration: 0.3 },
            }
          : undefined
      }
      className={cn(
        "relative rounded-xl border border-gold-400/20 p-6",
        "bg-gradient-to-br from-atlantic-700/60 to-atlantic-800/40",
        "backdrop-blur-xl",
        hover && "hover:border-gold-400/50 hover:shadow-premium-lg cursor-pointer",
        glow && "shadow-premium-glow border-gold-400/40",
        "transition-shadow duration-500",
        className
      )}
      {...props}
    >
      {/* Inner glow on hover */}
      {hover && (
        <div className="absolute inset-0 rounded-xl bg-gold-400/0 group-hover:bg-gold-400/[0.03] transition-colors duration-500 pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
}

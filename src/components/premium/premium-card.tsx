"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function PremiumCard({
  children,
  className,
  hover = true,
  glow = false,
  ...props
}: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "premium-card p-6",
        hover && "hover:shadow-premium-lg hover:border-gold-400 transition-all duration-300",
        glow && "shadow-premium-glow",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface PremiumBorderProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glow" | "subtle";
}

export function PremiumBorder({
  children,
  className,
  variant = "default",
}: PremiumBorderProps) {
  const variants = {
    default: "border-gold-400/50 hover:border-gold-400",
    glow: "border-gold-400 shadow-premium-glow",
    subtle: "border-gold-400/20 hover:border-gold-400/50",
  };

  return (
    <div
      className={cn(
        "border rounded-premium transition-all duration-300",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

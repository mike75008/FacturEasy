"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
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
  delay: _delay = 0,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-gold-400/20 p-6",
        "bg-gradient-to-br from-atlantic-700/60 to-atlantic-800/40",
        "backdrop-blur-xl",
        hover && "hover:border-gold-400/50 hover:shadow-premium-lg hover:-translate-y-1 cursor-pointer",
        glow && "shadow-premium-glow border-gold-400/40",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

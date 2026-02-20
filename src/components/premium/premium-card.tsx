"use client";

import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
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
    <div
      className={cn(
        "premium-card p-6",
        hover && "hover:shadow-premium-lg hover:border-gold-400 transition-all duration-300",
        glow && "shadow-premium-glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

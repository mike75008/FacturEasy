"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({ children, variant = "primary", size = "md", loading, icon, className, disabled, ...props }, ref) => {
    const variants = {
      primary: "premium-button",
      outline: "premium-button-outline",
      ghost: "text-gold-400 hover:bg-gold-400/10 font-sans px-4 py-2 rounded-lg transition-all duration-200",
    };

    const sizes = {
      sm: "text-sm px-4 py-2",
      md: "text-base px-6 py-3",
      lg: "text-lg px-8 py-4",
    };

    return (
      <button
        ref={ref}
        className={cn(
          variants[variant],
          sizes[size],
          "hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150",
          (disabled || loading) && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        <span className="flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
          {children}
        </span>
      </button>
    );
  }
);

PremiumButton.displayName = "PremiumButton";

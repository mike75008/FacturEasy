"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-sans font-medium text-gold-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-400/50">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "premium-input w-full",
              icon && "pl-10",
              error && "border-red-400/50 focus:border-red-400 focus:ring-red-400/50",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-400 font-sans">{error}</p>
        )}
      </div>
    );
  }
);

PremiumInput.displayName = "PremiumInput";

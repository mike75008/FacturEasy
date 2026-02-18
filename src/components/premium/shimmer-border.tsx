"use client";

import { cn } from "@/lib/utils";

interface ShimmerBorderProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
}

export function ShimmerBorder({
  children,
  className,
  shimmerColor = "rgba(212, 175, 55, 0.6)",
}: ShimmerBorderProps) {
  return (
    <div className={cn("relative group rounded-xl", className)}>
      {/* Animated border */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          backgroundSize: "200% 200%",
          animation: "shimmer-move 3s ease-in-out infinite",
        }}
      />
      {/* Inner content */}
      <div className="relative rounded-xl overflow-hidden">{children}</div>
    </div>
  );
}

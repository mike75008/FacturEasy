"use client";

import Link from "next/link";

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
    <Link href="/" className={className}>
      <h1 className={`font-display font-bold ${sizes[size]}`}>
        <span className="gold-text">Facture</span>
        <span className="text-white">Pro</span>
      </h1>
      <p className="text-atlantic-200/60 text-sm font-sans tracking-wider uppercase">
        Facturation Intelligente
      </p>
    </Link>
  );
}

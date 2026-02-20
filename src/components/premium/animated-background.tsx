"use client";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-atlantic-900 via-atlantic-700 to-atlantic-800" />

      {/* CSS-only animated orbs (GPU-accelerated via transform, no JS) */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gold-400/[0.03] blur-[100px] animate-orb-1" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-atlantic-400/[0.04] blur-[80px] animate-orb-2" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-atlantic-900/50" />
    </div>
  );
}

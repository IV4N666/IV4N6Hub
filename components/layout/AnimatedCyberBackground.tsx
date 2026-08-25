"use client";

import React, { useEffect, useState } from "react";

export const AnimatedCyberBackground: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Cyber Dot-Grid Pattern Layer */}
      <div className="absolute inset-0 bg-cyber-grid opacity-30" />

      {/* 2. Floating Animated Neon Orbs (GPU Accelerated) */}
      <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] animate-orb-drift-1" />
      <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-[140px] animate-orb-drift-2" />
      <div className="absolute -bottom-32 left-1/4 w-[550px] h-[550px] rounded-full bg-cyan-500/12 blur-[130px] animate-orb-drift-3" />
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[120px] animate-orb-drift-4" />

      {/* 3. Floating Stardust Particles */}
      <div className="absolute inset-0">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
        <div className="particle particle-6" />
        <div className="particle particle-7" />
        <div className="particle particle-8" />
      </div>

      {/* 4. Subtle Vignette Depth Gradient */}
      <div className="absolute inset-0 bg-radial-vignette opacity-80" />
    </div>
  );
};

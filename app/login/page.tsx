"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { AnimatedCyberBackground } from "@/components/layout/AnimatedCyberBackground";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/finance";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your master passcode.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError(data.error || "Invalid passcode. Please try again.");
      }
    } catch (err) {
      setError("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Master Passcode
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <KeyRound className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            autoFocus
            required
            placeholder="Enter passcode..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl bg-slate-950/80 border border-slate-800 pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2 animate-shake">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-[1px] font-bold text-white shadow-xl shadow-blue-600/25 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
      >
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold transition-all group-hover:bg-opacity-90">
          <span>{loading ? "Decrypting Session..." : "Unlock Platform"}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#090d16] px-4 overflow-hidden font-sans select-none">
      {/* Dynamic Animated Ambient Background */}
      <AnimatedCyberBackground />

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 border border-blue-400/30">
              <Lock className="h-8 w-8 text-white animate-pulse" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-md">
                <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                IV4N6Hub Secure Vault
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                <Sparkles className="h-2.5 w-2.5" /> PRO
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
              Single-user master authentication. Enter your private passcode to unlock your financial hub.
            </p>
          </div>

          {/* Form with Suspense Boundary */}
          <Suspense fallback={<div className="text-center py-6 text-xs text-slate-500">Loading vault...</div>}>
            <LoginForm />
          </Suspense>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Default local passcode: <code className="text-blue-400 bg-slate-800/60 px-1.5 py-0.5 rounded font-mono">admin888</code>
            </p>
            <p className="text-[10px] text-slate-600 mt-1">
              Change your password anytime in System Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Smartphone,
  Laptop,
  Coins,
  Sparkles,
  RefreshCw,
  Bell,
} from "lucide-react";

interface HeaderProps {
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCurrency,
  onCurrencyChange,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              IV4N6Hub
            </h1>
            <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20 md:inline-block">
              ● Online & Syncing
            </span>
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">
            Modular Platform • Any Device Anywhere
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Device Badges indicator */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-700/50">
          <Smartphone className="h-3.5 w-3.5 text-blue-400" />
          <Laptop className="h-3.5 w-3.5 text-emerald-400" />
          <Globe className="h-3.5 w-3.5 text-purple-400" />
          <span className="ml-1 text-slate-400">PWA Ready</span>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700/60">
          <Coins className="ml-1.5 h-3.5 w-3.5 text-yellow-400" />
          <select
            value={currentCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="bg-transparent px-2 py-0.5 text-xs font-semibold text-white outline-none cursor-pointer"
          >
            <option value="MYR" className="bg-slate-900 text-white">MYR (RM)</option>
            <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
            <option value="SGD" className="bg-slate-900 text-white">SGD (S$)</option>
            <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
            <option value="GBP" className="bg-slate-900 text-white">GBP (£)</option>
            <option value="CNY" className="bg-slate-900 text-white">CNY (¥)</option>
          </select>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            title="Refresh Data"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60 transition-all active:scale-95"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
            />
          </button>
        )}

        {/* Quick Lock / Logout button */}
        <button
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            } catch (err) {
              console.error(err);
            }
          }}
          title="Lock Platform"
          className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
        >
          <span className="hidden sm:inline">Lock</span>
          <span className="text-[10px]">🔒</span>
        </button>

        {/* Time display */}
        <div className="hidden md:block text-right">
          <div className="text-xs font-medium text-slate-300">{currentTime}</div>
        </div>
      </div>
    </header>
  );
};

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  Smartphone,
  Laptop,
  Coins,
  Sparkles,
  RefreshCw,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  MessageSquare,
  Vault,
  StickyNote,
  Monitor,
  Grid,
  Settings,
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
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const navLinks = [
    { name: "Finance Dashboard", path: "/finance", icon: LayoutDashboard },
    { name: "Accounts & Assets", path: "/accounts", icon: Vault },
    { name: "Transactions Ledger", path: "/transactions", icon: Receipt },
    { name: "Notes & Smart Tasks", path: "/notes", icon: StickyNote },
    { name: "WhatsApp AI Hub", path: "/whatsapp-hub", icon: MessageSquare },
    { name: "PC & System Monitor", path: "/system-monitor", icon: Monitor },
    { name: "Modular Apps", path: "/modules", icon: Grid },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-3 sm:px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition-all"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/finance" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  IV4N6Hub
                </h1>
                <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 md:inline-block">
                  ● Online & Syncing
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Modular Platform • Any Device Anywhere
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4">
          {/* Device Badges indicator */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-700/50">
            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
            <Laptop className="h-3.5 w-3.5 text-emerald-400" />
            <Globe className="h-3.5 w-3.5 text-purple-400" />
            <span className="ml-1 text-slate-400">PWA Ready</span>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700/60">
            <Coins className="ml-1.5 h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <select
              value={currentCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="bg-transparent px-1.5 py-0.5 text-xs font-semibold text-white outline-none cursor-pointer"
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
            className="flex items-center gap-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
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

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative z-10 flex w-4/5 max-w-xs flex-1 flex-col bg-slate-950 border-r border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">IV4N6Hub</h2>
                  <p className="text-[10px] text-slate-400">Mobile Navigation Menu</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Main Applications
              </p>
              {navLinks.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-blue-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Footer in Drawer */}
            <div className="border-t border-slate-800/80 pt-4 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cloud Synced & Online</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

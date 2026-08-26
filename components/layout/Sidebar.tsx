"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  MessageSquare,
  Receipt,
  Grid,
  Settings,
  PlusCircle,
  Sparkles,
  Zap,
  Monitor,
  StickyNote,
  Vault,
} from "lucide-react";

interface SidebarProps {
  onOpenAddModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddModal }) => {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      path: "/finance",
      icon: LayoutDashboard,
    },
    {
      name: "Accounts & Assets",
      path: "/accounts",
      icon: Vault,
    },
    {
      name: "Transactions",
      path: "/transactions",
      icon: Receipt,
    },
    {
      name: "Notes & Tasks",
      path: "/notes",
      icon: StickyNote,
    },
    {
      name: "WhatsApp AI Hub",
      path: "/whatsapp-hub",
      icon: MessageSquare,
    },
    {
      name: "PC & System Monitor",
      path: "/system-monitor",
      icon: Monitor,
    },
    {
      name: "Modular Apps",
      path: "/modules",
      icon: Grid,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col justify-between border-r border-slate-800/80 bg-slate-950/50 p-4 backdrop-blur-xl">
      <div className="space-y-6">
        {/* Quick Add Button */}
        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Add Transaction</span>
          </button>
        )}

        {/* Navigation Section */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Modules
          </p>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive
                        ? "text-blue-400"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Modular Expansion Card */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-950/40 to-slate-900/60 p-3.5 text-xs">
          <div className="flex items-center gap-2 text-blue-400 font-semibold mb-1.5">
            <Zap className="h-4 w-4" />
            <span>Extensible Platform</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Need Notes, Tasks, or Inventory? Turn them on anytime from the{" "}
            <Link href="/modules" className="text-blue-400 underline hover:text-blue-300">
              Module Hub
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>IV4N6Hub v1.0</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            Cloud Ready
          </span>
        </div>
      </div>
    </aside>
  );
};

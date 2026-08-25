"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  MessageSquare,
  Grid,
  Plus,
} from "lucide-react";

interface MobileNavProps {
  onOpenAddModal?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenAddModal }) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Finance", path: "/finance", icon: LayoutDashboard },
    { name: "Ledger", path: "/transactions", icon: Receipt },
    { name: "WhatsApp AI", path: "/whatsapp-hub", icon: MessageSquare, highlight: true },
    { name: "Apps", path: "/modules", icon: Grid },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-900/95 px-2 backdrop-blur-lg md:hidden">
      {navItems.slice(0, 2).map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors ${
              isActive ? "text-blue-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}

      {/* Center Action Button */}
      {onOpenAddModal && (
        <button
          onClick={onOpenAddModal}
          className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/40 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {navItems.slice(2).map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors ${
              isActive ? "text-blue-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              {item.highlight && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

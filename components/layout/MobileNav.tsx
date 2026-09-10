"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  MessageSquare,
  StickyNote,
  Plus,
} from "lucide-react";

interface MobileNavProps {
  onOpenAddModal?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenAddModal }) => {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    // Check pending tasks count for mobile badge
    fetch("/api/todos?status=PENDING")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.count === "number") {
          setPendingCount(data.count);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const leftNavItems = [
    { name: "Finance", path: "/finance", icon: LayoutDashboard },
    { name: "Ledger", path: "/transactions", icon: Receipt },
  ];

  const rightNavItems = [
    {
      name: "Tasks & Notes",
      path: "/notes",
      icon: StickyNote,
      badge: pendingCount && pendingCount > 0 ? pendingCount : null,
    },
    { name: "AI Hub", path: "/whatsapp-hub", icon: MessageSquare },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-900/95 px-2 backdrop-blur-lg md:hidden">
      {leftNavItems.map((item) => {
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
          title="Quick Add Transaction"
          className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/40 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      )}

      {rightNavItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`relative flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors ${
              isActive ? "text-blue-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-extrabold text-slate-950 shadow-sm animate-pulse">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </div>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

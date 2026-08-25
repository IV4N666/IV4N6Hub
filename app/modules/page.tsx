"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Grid,
  DollarSign,
  MessageSquare,
  Receipt,
  CheckSquare,
  BookOpen,
  Package,
  Users,
  Sparkles,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Code2,
} from "lucide-react";
import { PlatformModule } from "@/lib/types";

export default function ModulesPage() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/modules");
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
      }
    } catch (err) {
      console.error("Failed to load modules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggleModule = async (key: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, isEnabled: !currentStatus }),
      });
      if (res.ok) {
        setModules((prev) =>
          prev.map((m) => (m.key === key ? { ...m, isEnabled: !currentStatus } : m))
        );
      }
    } catch (err) {
      console.error("Failed to toggle module:", err);
    }
  };

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case "DollarSign":
        return <DollarSign className="h-6 w-6 text-blue-400" />;
      case "MessageSquare":
        return <MessageSquare className="h-6 w-6 text-emerald-400" />;
      case "Receipt":
        return <Receipt className="h-6 w-6 text-purple-400" />;
      case "CheckSquare":
        return <CheckSquare className="h-6 w-6 text-amber-400" />;
      case "BookOpen":
        return <BookOpen className="h-6 w-6 text-indigo-400" />;
      case "Package":
        return <Package className="h-6 w-6 text-teal-400" />;
      case "Users":
        return <Users className="h-6 w-6 text-rose-400" />;
      default:
        return <Grid className="h-6 w-6 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Modular Platform Hub
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          IV4N6Hub is built on an extensible plugin architecture. Enable, disable, or plug in any new business tool, tracking system, or AI workflow whenever you need it.
        </p>
      </div>

      {/* Active & Available Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Platform Modules & Add-Ons
          </h3>
          <span className="text-xs text-slate-400">
            {modules.filter((m) => m.isEnabled).length} active modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => (
            <div
              key={mod.key}
              className={`glass-card rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                mod.isEnabled
                  ? "border-slate-700/80 bg-slate-900/90 shadow-lg"
                  : "border-slate-800/40 bg-slate-950/40 opacity-70"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700/60">
                    {getModuleIcon(mod.icon)}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      mod.isEnabled
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {mod.isEnabled ? "Active" : "Available"}
                  </span>
                </div>

                <h4 className="mt-4 text-base font-bold text-white">{mod.name}</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => handleToggleModule(mod.key, mod.isEnabled)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    mod.isEnabled
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      : "bg-blue-600 text-white hover:bg-blue-500 shadow-md"
                  }`}
                >
                  {mod.isEnabled ? "Disable Module" : "+ Enable Module"}
                </button>

                {mod.isEnabled && (
                  <Link
                    href={mod.path}
                    className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Launch</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Extensibility Guide */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-indigo-400" />
          <span>How to Add Any Future Custom Feature</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Because this system is built on Next.js, Prisma, and Tailwind, adding a whole new capability (e.g. Invoicing, Inventory, Habit Tracker, or WhatsApp Auto-reminders) takes 3 simple steps:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <span className="font-bold text-blue-400 block mb-1">Step 1: Database Model</span>
            <p className="text-slate-400">
              Add your new data model to <code>prisma/schema.prisma</code> (e.g. <code>model Task</code> or <code>model InventoryItem</code>).
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">Step 2: API & AI Parser</span>
            <p className="text-slate-400">
              Create an API route under <code>app/api/your-feature/route.ts</code> and add WhatsApp voice extraction keywords in <code>lib/gemini.ts</code>.
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <span className="font-bold text-purple-400 block mb-1">Step 3: Frontend Page</span>
            <p className="text-slate-400">
              Create <code>app/your-feature/page.tsx</code> and register the module in <code>PlatformModule</code> table.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

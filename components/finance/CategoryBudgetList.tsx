"use client";

import React, { useState } from "react";
import { CategoryBudget, MonthlyStats } from "@/lib/types";
import { formatCurrency, getCategoryMeta } from "@/lib/category-meta";
import { SlidersHorizontal, AlertTriangle, CheckCircle2, Edit3, X } from "lucide-react";

interface CategoryBudgetListProps {
  budgets: CategoryBudget[];
  monthly: MonthlyStats;
  currency: string;
  onBudgetUpdated: () => void;
}

export const CategoryBudgetList: React.FC<CategoryBudgetListProps> = ({
  budgets,
  monthly,
  currency,
  onBudgetUpdated,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Map category expenses
  const spentMap: Record<string, number> = {};
  monthly.categoryBreakdown.forEach((c) => {
    spentMap[c.category] = c.total;
  });

  const handleEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setNewLimit(String(currentLimit));
  };

  const handleSave = async (category: string) => {
    if (!newLimit || isNaN(Number(newLimit))) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/finance/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, monthlyLimit: Number(newLimit) }),
      });
      if (res.ok) {
        onBudgetUpdated();
        setEditingCategory(null);
      }
    } catch (err) {
      console.error("Failed to update budget:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-400" />
            <span>Monthly Category Budgets</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Spending vs configured target limits for {monthly.monthName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((b) => {
          const spent = spentMap[b.category] || 0;
          const limit = b.monthlyLimit;
          const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
          const isOver = percentage > 100;
          const isWarning = percentage >= 80 && percentage <= 100;
          const meta = getCategoryMeta(b.category);

          const isEditing = editingCategory === b.category;

          return (
            <div
              key={b.id || b.category}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
                    {b.category}
                  </span>
                </div>
                <button
                  onClick={() => handleEdit(b.category, limit)}
                  className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                  title="Adjust Budget Target"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>

              {isEditing ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-white outline-none focus:border-blue-500"
                    placeholder="Monthly Limit"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSave(b.category)}
                    disabled={isSaving}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500 shrink-0"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="p-1 text-slate-400 hover:text-white shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="font-bold text-white">
                      {formatCurrency(spent, currency)}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      of {formatCurrency(limit, currency)} limit
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? "bg-red-500"
                          : isWarning
                          ? "bg-amber-400"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${
                        isOver
                          ? "text-red-400 flex items-center gap-1"
                          : isWarning
                          ? "text-amber-400"
                          : "text-slate-400"
                      }`}
                    >
                      {isOver && <AlertTriangle className="h-3 w-3 inline" />}
                      {percentage}% used
                    </span>
                    <span className="text-slate-400">
                      {isOver
                        ? `${formatCurrency(spent - limit, currency)} over`
                        : `${formatCurrency(limit - spent, currency)} left`}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

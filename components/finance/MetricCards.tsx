"use client";

import React from "react";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Calendar,
  Flame,
} from "lucide-react";
import { MonthlyStats, YearlyStats } from "@/lib/types";
import { formatCurrency } from "@/lib/category-meta";

interface MetricCardsProps {
  monthly: MonthlyStats;
  yearly: YearlyStats;
  currency: string;
  viewMode: "monthly" | "yearly";
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  monthly,
  yearly,
  currency,
  viewMode,
}) => {
  const isMonthly = viewMode === "monthly";

  const totalExpense = isMonthly ? monthly.totalExpense : yearly.totalExpense;
  const totalIncome = isMonthly ? monthly.totalIncome : yearly.totalIncome;
  const netSavings = isMonthly ? monthly.netSavings : yearly.netSavings;
  const savingsRate = isMonthly ? monthly.savingsRate : yearly.savingsRate;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Spending */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isMonthly ? "Monthly Spending" : "Yearly Spending"}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-white">
            {formatCurrency(totalExpense, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            {isMonthly ? (
              <>
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span>
                  Avg ~{formatCurrency(monthly.dailyAverageSpend, currency)}/day
                </span>
              </>
            ) : (
              <>
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                <span>
                  Avg ~{formatCurrency(yearly.monthlyAverageExpense, currency)}/mo
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Total Income */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isMonthly ? "Monthly Income" : "Yearly Income"}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-white">
            {formatCurrency(totalIncome, currency)}
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-medium">
            {isMonthly ? "Current active month" : "12-month period"}
          </div>
        </div>
      </div>

      {/* Net Balance / Savings */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Savings
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              netSavings >= 0
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-bold tracking-tight ${
              netSavings >= 0 ? "text-blue-400" : "text-red-400"
            }`}
          >
            {formatCurrency(netSavings, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {netSavings >= 0 ? "Surplus funds saved" : "Expenses exceed income"}
          </div>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Savings Rate
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <PiggyBank className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-white">
            {savingsRate}%
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

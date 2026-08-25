"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { MonthlyStats, YearlyStats } from "@/lib/types";
import { formatCurrency } from "@/lib/category-meta";

interface ExpenseChartsProps {
  monthly: MonthlyStats;
  yearly: YearlyStats;
  currency: string;
  viewMode: "monthly" | "yearly";
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({
  monthly,
  yearly,
  currency,
  viewMode,
}) => {
  const isMonthly = viewMode === "monthly";

  // Category data for Pie chart
  const categoryData = isMonthly
    ? monthly.categoryBreakdown
    : yearly.topExpenseCategories;

  // Custom Pie Chart Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-semibold text-white text-xs">{data.category}</span>
          </div>
          <div className="mt-1 text-sm font-bold text-slate-100">
            {formatCurrency(data.total, currency)} ({data.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Bar Chart Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md text-xs">
          <div className="font-semibold text-white mb-1.5">{label}</div>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
              <span style={{ color: item.color }} className="font-medium">
                {item.name}:
              </span>
              <span className="font-bold text-white">
                {formatCurrency(item.value, currency)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Category Distribution (Donut / Pie Chart) */}
      <div className="glass-card rounded-2xl p-5 lg:col-span-5 border border-slate-800/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              {isMonthly ? "Category Breakdown (This Month)" : "Top Categories (This Year)"}
            </h3>
            <span className="text-xs text-slate-400">
              {categoryData.length} active categories
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Where your funds are distributed
          </p>
        </div>

        {categoryData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            No expense transactions recorded for this period.
          </div>
        ) : (
          <div className="my-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 4 Categories List */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
          {categoryData.slice(0, 4).map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="truncate text-slate-300 font-medium">{cat.category}</span>
              <span className="ml-auto font-semibold text-slate-100">
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly / Yearly Flow Chart */}
      <div className="glass-card rounded-2xl p-5 lg:col-span-7 border border-slate-800/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              {isMonthly ? "Daily Spending Rhythm (This Month)" : "Monthly Inflow vs Outflow (12 Months)"}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="text-slate-400">Expense</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Income</span>
              </div>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {isMonthly
              ? "Day-by-day cashflow timeline"
              : "Compare income generated against money spent throughout the year"}
          </p>
        </div>

        <div className="my-3 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {isMonthly ? (
              <AreaChart data={monthly.dailySpending} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="day" stroke="#64748b" tickLine={false} textAnchor="end" fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomBarTooltip />} />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
              </AreaChart>
            ) : (
              <BarChart data={yearly.monthlyBreakdown} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="shortName" stroke="#64748b" tickLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>{isMonthly ? `Period: ${monthly.monthName}` : `Year: ${yearly.year}`}</span>
          <span className="font-semibold text-slate-200">
            Net: {formatCurrency(isMonthly ? monthly.netSavings : yearly.netSavings, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};

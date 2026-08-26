"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  MessageSquare,
  Mic,
  PlusCircle,
  BarChart3,
  SlidersHorizontal,
  ArrowRightLeft,
  Repeat,
  Download,
  Vault,
} from "lucide-react";
import {
  MonthlyStats,
  YearlyStats,
  CategoryBudget,
  Transaction,
  Account,
  TransactionType,
} from "@/lib/types";
import { MetricCards } from "@/components/finance/MetricCards";
import { ExpenseCharts } from "@/components/finance/ExpenseCharts";
import { CategoryBudgetList } from "@/components/finance/CategoryBudgetList";
import { RecentTransactions } from "@/components/finance/RecentTransactions";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { AccountBalanceGrid } from "@/components/finance/AccountBalanceGrid";
import { RecurringBillsModal } from "@/components/finance/RecurringBillsModal";
import { format, subMonths, addMonths } from "date-fns";

export default function FinanceDashboard() {
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 24)); // Default to August 2026
  const [currency, setCurrency] = useState("MYR");
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSummary, setAccountSummary] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<TransactionType>("EXPENSE");
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  const currentYearMonth = format(currentDate, "yyyy-MM");
  const currentYear = currentDate.getFullYear();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, txRes, accRes] = await Promise.all([
        fetch(`/api/finance/stats?month=${currentYearMonth}&year=${currentYear}`),
        fetch(`/api/finance/transactions?limit=20`),
        fetch(`/api/finance/accounts`),
      ]);

      const statsData = await statsRes.json();
      const txData = await txRes.json();
      const accData = await accRes.json();

      if (statsData.success) {
        setMonthlyStats(statsData.monthly);
        setYearlyStats(statsData.yearly);
        setBudgets(statsData.budgets || []);
        if (statsData.config?.defaultCurrency) {
          setCurrency(statsData.config.defaultCurrency);
        }
      }

      if (txData.success) {
        setTransactions(txData.transactions || []);
      }

      if (accData.success) {
        setAccounts(accData.accounts || []);
        if (accData.summary) {
          setAccountSummary(accData.summary);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentYearMonth, currentYear]);

  const handlePrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setCurrentDate((d) => addMonths(d, 1));

  const handlePrevYear = () => {
    setCurrentDate((d) => new Date(d.getFullYear() - 1, d.getMonth(), 1));
  };
  const handleNextYear = () => {
    setCurrentDate((d) => new Date(d.getFullYear() + 1, d.getMonth(), 1));
  };

  const handleOpenModal = (type: TransactionType = "EXPENSE") => {
    setModalInitialType(type);
    setIsAddModalOpen(true);
  };

  const handleExportBackup = () => {
    window.open("/api/finance/backup?format=csv", "_blank");
  };

  if (loading && !monthlyStats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading Financial Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* WhatsApp Voice & Text AI Quick Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-slate-900/80 to-blue-950/40 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  WhatsApp Voice & Text Expense Sync
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Send voice notes or text messages anytime on WhatsApp. AI automatically extracts amount & updates accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecurringModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 px-3.5 py-2 text-xs font-bold text-purple-200 transition-all active:scale-95 shrink-0"
            >
              <Repeat className="h-4 w-4 text-purple-400" />
              <span>Subscriptions</span>
            </button>

            <Link
              href="/whatsapp-hub"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 shrink-0"
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Multi-Account Balances & Net Worth (ezBookkeeping style) */}
      <AccountBalanceGrid
        accounts={accounts}
        summary={accountSummary}
        currency={currency}
        onOpenTransferModal={() => handleOpenModal("TRANSFER")}
        onRefresh={fetchData}
      />

      {/* Control Bar: View Mode & Date Switchers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Financial Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monthly & yearly spending analysis, cashflow, and budget targets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Monthly / Yearly Switcher */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setViewMode("monthly")}
              className={`rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                viewMode === "monthly"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setViewMode("yearly")}
              className={`rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                viewMode === "yearly"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly View
            </button>
          </div>

          {/* Date Selector */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200">
            <button
              onClick={viewMode === "monthly" ? handlePrevMonth : handlePrevYear}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 font-semibold min-w-[120px] text-center">
              {viewMode === "monthly"
                ? format(currentDate, "MMMM yyyy")
                : `Year ${currentYear}`}
            </span>

            <button
              onClick={viewMode === "monthly" ? handleNextMonth : handleNextYear}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Transfer & Add Buttons */}
          <button
            onClick={() => handleOpenModal("TRANSFER")}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3 py-2 text-xs font-bold text-indigo-200 transition-all active:scale-95"
            title="Transfer between accounts"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => handleOpenModal("EXPENSE")}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all active:scale-95"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Record</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Monthly & Yearly calculations) */}
      {monthlyStats && yearlyStats && (
        <MetricCards
          monthly={monthlyStats}
          yearly={yearlyStats}
          currency={currency}
          viewMode={viewMode}
        />
      )}

      {/* Interactive Charts */}
      {monthlyStats && yearlyStats && (
        <ExpenseCharts
          monthly={monthlyStats}
          yearly={yearlyStats}
          currency={currency}
          viewMode={viewMode}
        />
      )}

      {/* Category Budgets vs Spending */}
      {monthlyStats && (
        <CategoryBudgetList
          budgets={budgets}
          monthly={monthlyStats}
          currency={currency}
          onBudgetUpdated={fetchData}
        />
      )}

      {/* Recent Transactions list */}
      <RecentTransactions
        transactions={transactions}
        currency={currency}
        onOpenAddModal={() => handleOpenModal("EXPENSE")}
      />

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
        currency={currency}
        initialType={modalInitialType}
      />

      <RecurringBillsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        currency={currency}
        accounts={accounts}
        onSuccess={fetchData}
      />
    </div>
  );
}

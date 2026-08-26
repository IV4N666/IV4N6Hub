"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Landmark,
  Smartphone,
  CreditCard,
  TrendingUp,
  Vault,
  Plus,
  ArrowRightLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  Loader2,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Account, AccountType, Transaction } from "@/lib/types";
import { formatCurrency, ACCOUNT_TYPE_META } from "@/lib/category-meta";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { format } from "date-fns";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("MYR");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Create / Edit Account Form States
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountTransactions = async (accId: string) => {
    try {
      setTxLoading(true);
      const res = await fetch(`/api/finance/transactions?accountId=${accId}&limit=30`);
      const data = await res.json();
      if (data.success) {
        setAccountTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountTransactions(selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleOpenCreateModal = () => {
    setName("");
    setType("BANK");
    setBalance("0.00");
    setColor("#3b82f6");
    setEditingAccount(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(String(acc.balance));
    setColor(acc.color);
    setIsEditModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Account name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingAccount) {
        // Update
        const res = await fetch("/api/finance/accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAccount.id,
            name,
            type,
            balance: Number(balance),
            color,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);
        setSuccessMsg("Account updated successfully");
      } else {
        // Create
        const res = await fetch("/api/finance/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type,
            currency,
            balance: Number(balance),
            color,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);
        setSuccessMsg("Account created successfully");
      }

      setIsEditModalOpen(false);
      fetchAccounts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to archive this account?")) return;
    try {
      await fetch(`/api/finance/accounts?id=${id}`, { method: "DELETE" });
      fetchAccounts();
      if (selectedAccountId === id) setSelectedAccountId(null);
    } catch (err: any) {
      alert("Failed to archive account");
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case "CASH":
        return Wallet;
      case "BANK":
        return Landmark;
      case "E_WALLET":
        return Smartphone;
      case "CREDIT_CARD":
        return CreditCard;
      case "INVESTMENT":
        return TrendingUp;
      default:
        return Vault;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Vault className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Accounts & Net Worth (多账户资产管理)
              </h2>
              <p className="text-xs text-slate-400">
                Track bank balances, e-wallets, credit cards & reconcile funds like ezBookkeeping
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3.5 py-2 text-xs font-bold text-indigo-200 transition-all active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Account</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Net Worth Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-950 p-5 shadow-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
            Total Net Worth (全局净资产)
          </span>
          <div className="mt-2 text-3xl font-black tracking-tight text-white">
            {formatCurrency(summary.netWorth, currency)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Liquid assets minus active credit obligations
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 p-5 shadow-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Total Cash & Assets (总流动资产)
          </span>
          <div className="mt-2 text-3xl font-black tracking-tight text-emerald-400">
            {formatCurrency(summary.totalAssets, currency)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Deposits across {accounts.filter((a) => a.type !== "CREDIT_CARD").length} liquid accounts
          </p>
        </div>

        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/30 via-slate-900/90 to-slate-950 p-5 shadow-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-pink-300">
            Total Liabilities (待还账单/信用卡)
          </span>
          <div className="mt-2 text-3xl font-black tracking-tight text-pink-400">
            {formatCurrency(summary.totalLiabilities, currency)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Credit cards & outstanding balances
          </p>
        </div>
      </div>

      {/* Accounts List & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Accounts Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Active Accounts ({accounts.length})
            </h3>
            <button
              onClick={fetchAccounts}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const Icon = getAccountIcon(acc.type);
              const meta = ACCOUNT_TYPE_META[acc.type] || ACCOUNT_TYPE_META.BANK;
              const isSelected = selectedAccountId === acc.id;

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`group cursor-pointer relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                    isSelected
                      ? "border-blue-500 bg-slate-900/95 shadow-xl ring-1 ring-blue-500/50"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10"
                        style={{
                          backgroundColor: `${acc.color || meta.defaultColor}25`,
                          color: acc.color || meta.defaultColor,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {acc.name}
                        </h4>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(acc);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Edit Account / Adjust Balance"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(acc.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400"
                        title="Archive"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t border-slate-800/80 pt-3">
                    <span className="text-xs text-slate-400">Current Balance:</span>
                    <span
                      className={`text-xl font-black tracking-tight ${
                        acc.balance < 0 ? "text-rose-400" : "text-white"
                      }`}
                    >
                      {formatCurrency(acc.balance, acc.currency || currency)}
                    </span>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 transition-all"
                    style={{ backgroundColor: acc.color || meta.defaultColor }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Account Transactions Drawer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Account Activity
            </h3>
            {selectedAccountId && (
              <button
                onClick={() => setSelectedAccountId(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 min-h-[300px]">
            {!selectedAccountId ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-4">
                <Vault className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 font-medium">
                  Select an account from the left to view its dedicated transaction history & cashflow.
                </p>
              </div>
            ) : txLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : accountTransactions.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-slate-400">No transactions recorded for this account yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto space-y-1">
                {accountTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white truncate max-w-[150px]">
                        {tx.description || tx.category}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div
                      className={`font-mono font-bold ${
                        tx.type === "INCOME"
                          ? "text-emerald-400"
                          : tx.type === "TRANSFER"
                          ? "text-indigo-400"
                          : "text-slate-300"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : tx.type === "TRANSFER" ? "↔" : "-"}
                      {formatCurrency(tx.amount, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Account Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingAccount ? "Edit Account & Balance" : "Create New Account"}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-400">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maybank Savings, CIMB Credit Card"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="CASH">Cash & Wallet</option>
                    <option value="BANK">Bank Account</option>
                    <option value="E_WALLET">E-Wallet (TNG, Grab)</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">
                    Current Balance ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">
                  Theme Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {["#3b82f6", "#10b981", "#06b6d4", "#ec4899", "#8b5cf6", "#f97316", "#eab308"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          color === c ? "scale-110 border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal */}
      <AddTransactionModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          fetchAccounts();
          if (selectedAccountId) fetchAccountTransactions(selectedAccountId);
        }}
        currency={currency}
        initialType="TRANSFER"
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Repeat,
  Zap,
  Sparkles,
  Loader2,
  CreditCard,
} from "lucide-react";
import { RecurringBill, Account, RecurringFrequency } from "@/lib/types";
import { formatCurrency, CATEGORY_DEFINITIONS } from "@/lib/category-meta";
import { format } from "date-fns";

interface RecurringBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  accounts: Account[];
  onSuccess?: () => void;
}

export const RecurringBillsModal: React.FC<RecurringBillsModalProps> = ({
  isOpen,
  onClose,
  currency,
  accounts,
  onSuccess,
}) => {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New bill state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [category, setCategory] = useState("Bills & Utilities");
  const [frequency, setFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [nextDueDate, setNextDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [accountId, setAccountId] = useState<string>("");

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/recurring");
      const data = await res.json();
      if (data.success) {
        setBills(data.recurring || []);
      }
    } catch (err: any) {
      console.error("Failed to load recurring bills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBills();
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || isNaN(Number(amount))) {
      setError("Please provide a valid bill name and amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/finance/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: Number(amount),
          type,
          category,
          frequency,
          nextDueDate,
          accountId: accountId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create recurring bill");
      }

      setName("");
      setAmount("");
      setShowAddForm(false);
      setSuccessMsg("Recurring subscription created successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchBills();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteNow = async (billId: string) => {
    try {
      setExecutingId(billId);
      setError(null);
      const res = await fetch("/api/finance/recurring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: billId,
          action: "EXECUTE_NOW",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute payment");
      }

      setSuccessMsg(data.message || "Payment recorded in ledger!");
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchBills();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Execution failed");
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this recurring bill?")) return;
    try {
      await fetch(`/api/finance/recurring?id=${billId}`, { method: "DELETE" });
      fetchBills();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete bill");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Recurring Bills & Subscriptions (周期性账单)
              </h3>
              <p className="text-xs text-slate-400">
                Manage Netflix, Rent, Utilities, Salary & automate repeat payments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Bill Button or Form */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-500/40 bg-purple-950/20 hover:bg-purple-950/40 py-3 text-xs font-bold text-purple-300 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Subscription / Periodic Bill</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddBill}
              className="rounded-2xl border border-purple-500/30 bg-purple-950/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">
                  New Recurring Item
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Bill / Service Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netflix Premium, House Rent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="EXPENSE">Expense (支出)</option>
                    <option value="INCOME">Income (固定收入)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly (每月)</option>
                    <option value="WEEKLY">Weekly (每周)</option>
                    <option value="YEARLY">Yearly (每年)</option>
                    <option value="DAILY">Daily (每日)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Auto-Debit / Credit Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- None (Manual Account) --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type} - {formatCurrency(acc.balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create Subscription"}
              </button>
            </form>
          )}

          {/* List of Bills */}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : bills.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-center">
              <p className="text-xs text-slate-400">
                No recurring bills configured yet. Add your monthly rent, Netflix, Spotify, gym membership, or salary!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bills.map((bill) => {
                const isPending = executingId === bill.id;
                return (
                  <div
                    key={bill.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                          bill.type === "INCOME"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        }`}
                      >
                        {bill.type === "INCOME" ? "+" : "-"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {bill.name}
                          </h4>
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                            {bill.frequency}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span>
                            Next: {format(new Date(bill.nextDueDate), "MMM d, yyyy")}
                          </span>
                          {bill.account && (
                            <span className="text-slate-300">
                              💳 {bill.account.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span
                        className={`text-sm font-black ${
                          bill.type === "INCOME" ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {formatCurrency(bill.amount, currency)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleExecuteNow(bill.id)}
                          disabled={isPending}
                          title="Record payment in ledger now"
                          className="flex items-center gap-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 px-2.5 py-1.5 text-xs font-bold text-purple-200 transition-all disabled:opacity-50"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5 text-purple-400" />
                          )}
                          <span>Pay Now</span>
                        </button>

                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="rounded-xl p-1.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

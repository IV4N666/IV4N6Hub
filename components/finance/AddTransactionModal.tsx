"use client";

import React, { useState } from "react";
import { X, Plus, DollarSign, Calendar, Tag, FileText } from "lucide-react";
import { CATEGORY_DEFINITIONS } from "@/lib/category-meta";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currency: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currency,
}) => {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [category, setCategory] = useState("Food & Dining");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type,
          category: type === "INCOME" ? "Salary & Income" : category,
          description: description.trim() || (type === "INCOME" ? "Income" : category),
          source: "WEB_MANUAL",
          currency,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create transaction");
      }

      // Reset
      setAmount("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Object.keys(CATEGORY_DEFINITIONS).filter(
    (c) => c !== "Salary & Income"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Add Transaction</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Type Toggle: Expense / Income */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                type === "EXPENSE"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                type === "INCOME"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-14 pr-4 py-2.5 text-base font-bold text-white outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Category Selector (If expense) */}
          {type === "EXPENSE" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description / Merchant (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Starbucks, Grocery, Client Payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

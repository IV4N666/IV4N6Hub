"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Mic,
  MessageSquare,
  Globe,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Check,
} from "lucide-react";
import { Transaction } from "@/lib/types";
import { formatCurrency, getCategoryMeta, CATEGORY_DEFINITIONS } from "@/lib/category-meta";
import { format } from "date-fns";

export default function TransactionsLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (sourceFilter !== "ALL") params.append("source", sourceFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/finance/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [categoryFilter, typeFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(`/api/finance/transactions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category);
    setEditDesc(tx.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTx.id,
          amount: Number(editAmount),
          category: editCategory,
          description: editDesc,
        }),
      });
      if (res.ok) {
        setEditingTx(null);
        fetchTransactions();
      }
    } catch (e) {
      console.error("Update failed:", e);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Date", "Type", "Category", "Amount", "Currency", "Description", "Source", "RawInput"];
    const rows = transactions.map((t) => [
      format(new Date(t.date), "yyyy-MM-dd"),
      t.type,
      `"${t.category}"`,
      t.amount,
      t.currency,
      `"${t.description || ""}"`,
      t.source,
      `"${t.rawInput || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `IV4N6Hub_Transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "WHATSAPP_VOICE":
        return (
          <span className="flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
            <Mic className="h-3 w-3 text-purple-400" />
            <span>WA Voice</span>
          </span>
        );
      case "WHATSAPP_TEXT":
        return (
          <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
            <MessageSquare className="h-3 w-3 text-emerald-400" />
            <span>WA Text</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
            <Globe className="h-3 w-3 text-blue-400" />
            <span>Web</span>
          </span>
        );
    }
  };

  const categories = Object.keys(CATEGORY_DEFINITIONS);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Transactions Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete searchable history of all spending and earnings
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, merchant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Types (Expense & Income)</option>
              <option value="EXPENSE">Expense Only</option>
              <option value="INCOME">Income Only</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Channels / Sources</option>
              <option value="WHATSAPP_VOICE">WhatsApp Voice AI</option>
              <option value="WHATSAPP_TEXT">WhatsApp Text AI</option>
              <option value="WEB_MANUAL">Web Manual</option>
            </select>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 uppercase tracking-wider text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description / Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Source / Origin</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No transactions match your search filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const meta = getCategoryMeta(tx.category);
                  const isIncome = tx.type === "INCOME";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {format(new Date(tx.date), "yyyy-MM-dd")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white max-w-[240px] truncate">
                          {tx.description || tx.category}
                        </div>
                        {tx.rawInput && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">
                            &quot;{tx.rawInput}&quot;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-1 font-medium text-slate-200">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getSourceBadge(tx.source)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isIncome ? "text-emerald-400" : "text-slate-100"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount, tx.currency || currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEdit(tx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Edit Transaction</h3>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingTx(null)}
                className="w-1/2 rounded-xl bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="w-1/2 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

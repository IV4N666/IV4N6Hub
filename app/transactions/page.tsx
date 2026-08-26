"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit2,
  Mic,
  MessageSquare,
  Globe,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  X,
  Check,
  Camera,
  Repeat,
  Vault,
  FileSpreadsheet,
  FileCode,
  Sparkles,
} from "lucide-react";
import { Transaction, Account } from "@/lib/types";
import { formatCurrency, getCategoryMeta, CATEGORY_DEFINITIONS } from "@/lib/category-meta";
import { format } from "date-fns";

export default function TransactionsLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState("MYR");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Import / Export Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (accountFilter !== "ALL") params.append("accountId", accountFilter);
      if (sourceFilter !== "ALL") params.append("source", sourceFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const [txRes, accRes] = await Promise.all([
        fetch(`/api/finance/transactions?${params.toString()}&limit=200`),
        fetch("/api/finance/accounts"),
      ]);

      const txData = await txRes.json();
      const accData = await accRes.json();

      if (txData.success) {
        setTransactions(txData.transactions || []);
      }
      if (accData.success) {
        setAccounts(accData.accounts || []);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [categoryFilter, typeFilter, accountFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction? Account balance will be restored.")) return;
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
    setEditSubCategory(tx.subCategory || "");
    setEditTags(tx.tags || "");
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
          subCategory: editSubCategory || null,
          tags: editTags || null,
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

  const handleExportFullJSON = async () => {
    try {
      const res = await fetch("/api/finance/backup?format=json");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `IV4N6Hub_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
    } catch (err) {
      alert("Failed to export JSON backup");
    }
  };

  const handleExportCSV = () => {
    window.open("/api/finance/backup?format=csv", "_blank");
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus("Restoring backup package...");
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const res = await fetch("/api/finance/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "RESTORE_JSON",
          data: { data: jsonData.data || jsonData },
        }),
      });

      const result = await res.json();
      if (result.success) {
        setImportStatus(result.message || "Restored successfully!");
        fetchTransactions();
        setTimeout(() => {
          setIsBackupModalOpen(false);
          setImportStatus(null);
        }, 2500);
      } else {
        setImportStatus(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setImportStatus(`Failed to parse file: ${err.message}`);
    }
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
      case "RECEIPT_OCR":
        return (
          <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
            <Camera className="h-3 w-3 text-amber-400" />
            <span>OCR</span>
          </span>
        );
      case "RECURRING":
        return (
          <span className="flex items-center gap-1 rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
            <Repeat className="h-3 w-3 text-indigo-400" />
            <span>Auto-Bill</span>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Transactions Ledger (交易流水大屏)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete transaction records, multi-account filters, transfers & batch backup/restore
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-white transition-all active:scale-95"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            <span>Backup & Import</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search keyword / #tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </form>

        {/* Account Filter */}
        <div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Accounts (全部账户)</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                💳 {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Types (收/支/转)</option>
            <option value="EXPENSE">Expense (仅支出)</option>
            <option value="INCOME">Income (仅收入)</option>
            <option value="TRANSFER">Transfer (仅内部转账)</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {Object.keys(CATEGORY_DEFINITIONS).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Sources</option>
            <option value="WHATSAPP_VOICE">WhatsApp Voice</option>
            <option value="WHATSAPP_TEXT">WhatsApp Text</option>
            <option value="RECEIPT_OCR">AI Receipt OCR</option>
            <option value="RECURRING">Auto Subscription</option>
            <option value="WEB_MANUAL">Web Manual</option>
          </select>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No matching transactions found with current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-x-auto">
            {transactions.map((tx) => {
              const isIncome = tx.type === "INCOME";
              const isTransfer = tx.type === "TRANSFER";
              const meta = getCategoryMeta(tx.category);
              const isEditing = editingTx?.id === tx.id;

              return (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-slate-800/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isTransfer
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : isIncome
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft className="h-4 w-4" />
                      ) : isIncome ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Description"
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={editTags}
                              onChange={(e) => setEditTags(e.target.value)}
                              placeholder="#Tags"
                              className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {tx.description || tx.category}
                            </span>
                            {getSourceBadge(tx.source)}
                            {tx.subCategory && (
                              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                                {tx.subCategory}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                            {isTransfer ? (
                              <span className="text-indigo-300 font-medium text-[11px]">
                                {tx.account?.name || "Account"} ➔ {tx.toAccount?.name || "Target"}
                              </span>
                            ) : (
                              <>
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: meta.color }}
                                />
                                <span>{tx.category}</span>
                                {tx.account && (
                                  <span className="text-slate-300">
                                    💳 {tx.account.name}
                                  </span>
                                )}
                              </>
                            )}
                            <span>•</span>
                            <span>{format(new Date(tx.date), "MMM d, yyyy")}</span>
                            {tx.tags && (
                              <span className="text-[10px] text-cyan-400">
                                {tx.tags}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span
                      className={`text-base font-black ${
                        isTransfer
                          ? "text-indigo-300"
                          : isIncome
                          ? "text-emerald-400"
                          : "text-white"
                      }`}
                    >
                      {isTransfer ? "↔ " : isIncome ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency || currency)}
                    </span>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/20"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingTx(null)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(tx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Backup & Import Modal */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Data Backup & Migration Center (数据备份与迁移)
              </h3>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {importStatus && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 text-xs text-blue-300">
                {importStatus}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Export all financial data (accounts, ledger, subscriptions, budgets) or restore from an earlier backup snapshot.
              </p>

              {/* Export Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportFullJSON}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 p-3 hover:bg-slate-700 transition-all text-xs font-bold text-white"
                >
                  <FileCode className="h-5 w-5 text-cyan-400" />
                  <span>Full JSON Backup</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 p-3 hover:bg-slate-700 transition-all text-xs font-bold text-white"
                >
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Import Upload */}
              <div className="pt-2 border-t border-slate-800">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/40 py-3 text-xs font-bold text-cyan-300 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  <span>Restore from JSON Backup File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

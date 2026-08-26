"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Plus,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Receipt,
  Loader2,
  ArrowRightLeft,
  Wallet,
  Hash,
} from "lucide-react";
import { CATEGORY_DEFINITIONS, getCategoryMeta, formatCurrency } from "@/lib/category-meta";
import { Account, TransactionType } from "@/lib/types";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currency: string;
  initialType?: TransactionType;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currency,
  initialType = "EXPENSE",
}) => {
  const [entryMode, setEntryMode] = useState<"MANUAL" | "OCR">("MANUAL");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>(initialType);
  const [category, setCategory] = useState("Food & Dining");
  const [subCategory, setSubCategory] = useState("Lunch");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; price: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch accounts
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      fetch("/api/finance/accounts")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.accounts) {
            setAccounts(data.accounts);
            if (data.accounts.length > 0) {
              if (!accountId) setAccountId(data.accounts[0].id);
              if (data.accounts.length > 1 && !toAccountId) {
                setToAccountId(data.accounts[1].id);
              }
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen, initialType]);

  // Update default subcategory when category changes
  useEffect(() => {
    const meta = getCategoryMeta(category);
    if (meta.subCategories && meta.subCategories.length > 0) {
      setSubCategory(meta.subCategories[0]);
    } else {
      setSubCategory("General");
    }
  }, [category]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setOcrLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      setPreviewImage(reader.result as string);

      try {
        const res = await fetch("/api/ai/ocr-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg",
          }),
        });

        const data = await res.json();
        if (data.success && data.receipt) {
          setAmount(String(data.receipt.totalAmount || ""));
          setDescription(data.receipt.merchant || "Scanned Receipt");
          if (data.receipt.category) setCategory(data.receipt.category);
          if (data.receipt.date) setDate(data.receipt.date);
          if (data.receipt.items) setScannedItems(data.receipt.items);
          setType("EXPENSE");
          setEntryMode("MANUAL"); // Switch back to manual review with filled data
        } else {
          setError(data.error || "Could not extract receipt data.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to scan receipt image.");
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (type === "TRANSFER" && accountId === toAccountId) {
      setError("Source and destination accounts must be different for transfer");
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
          category:
            type === "TRANSFER"
              ? "Transfer"
              : type === "INCOME"
              ? "Salary & Income"
              : category,
          subCategory: type === "TRANSFER" ? null : subCategory,
          tags: tags.trim() || null,
          description:
            description.trim() ||
            (type === "TRANSFER"
              ? "Internal Account Transfer"
              : type === "INCOME"
              ? "Income"
              : category),
          source: previewImage ? "RECEIPT_OCR" : "WEB_MANUAL",
          currency,
          accountId: accountId || null,
          toAccountId: type === "TRANSFER" ? toAccountId || null : null,
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
      setTags("");
      setPreviewImage(null);
      setScannedItems([]);
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
  const currentCategoryMeta = getCategoryMeta(category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Transaction</h2>
              <p className="text-[11px] text-slate-400">Multi-Account Ledger & AI OCR Vision</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (Manual vs OCR) */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-950/80 p-1 mt-4 border border-slate-800">
          <button
            type="button"
            onClick={() => setEntryMode("MANUAL")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              entryMode === "MANUAL"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Manual Form</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("OCR")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              entryMode === "OCR"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-purple-300" />
            <span>📸 Scan Receipt (AI)</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* OCR Scan Upload Box */}
        {entryMode === "OCR" ? (
          <div className="mt-5 space-y-4 text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-950/20 p-8 transition-all hover:border-purple-400 hover:bg-purple-950/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/30 text-purple-300 border border-purple-500/40 group-hover:scale-105 transition-transform">
                  {ocrLoading ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <UploadCloud className="h-7 w-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {ocrLoading ? "Analyzing receipt with Gemini Vision..." : "Click or Snap Receipt Photo"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Supports JPG, PNG receipts, bills & dining invoices
                  </p>
                </div>
              </div>
            </div>

            {previewImage && (
              <div className="relative mx-auto max-h-48 overflow-hidden rounded-xl border border-slate-800">
                <img
                  src={previewImage}
                  alt="Receipt Preview"
                  className="w-full object-contain"
                />
              </div>
            )}
          </div>
        ) : (
          /* Manual Transaction Form */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* 3 Type Pills: Expense / Income / Transfer */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-950/80 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  type === "EXPENSE"
                    ? "bg-rose-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Expense (支出)
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  type === "INCOME"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Income (收入)
              </button>
              <button
                type="button"
                onClick={() => setType("TRANSFER")}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  type === "TRANSFER"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Transfer (转账)
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Amount ({currency})
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold">
                  {currency}
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-14 pr-4 py-2.5 text-base font-bold text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Transfer Account Selection (From -> To) */}
            {type === "TRANSFER" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
                <div>
                  <label className="text-[11px] font-bold text-indigo-300">
                    From Account (转出账户)
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-indigo-300">
                    To Account (转入账户)
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Account Selector for Expense/Income */
              accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {type === "INCOME" ? "Deposit To Account" : "Payment Account (支付账户)"}
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select Wallet/Card (Optional) --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type} - {formatCurrency(acc.balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            {/* Category & SubCategory (Hidden for Transfer) */}
            {type === "EXPENSE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Category (一级主分类)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    SubCategory (二级子分类)
                  </label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {(currentCategoryMeta.subCategories || ["General"]).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Description & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Description / Merchant
                </label>
                <input
                  type="text"
                  placeholder={type === "TRANSFER" ? "e.g. Top up TNG" : "e.g. Starbucks, Shell Petrol"}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Tags (标签, e.g. #Trip,#Work)
                </label>
                <input
                  type="text"
                  placeholder="#Vacation, #Reimburse"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Scanned Items list if available */}
            {scannedItems.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[11px] font-bold text-slate-400 mb-2">
                  🧾 Detected Items ({scannedItems.length})
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {scannedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-slate-300"
                    >
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-400">
                        {formatCurrency(item.price, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Transaction...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Transaction</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
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
  const [entryMode, setEntryMode] = useState<"MANUAL" | "OCR">("MANUAL");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [category, setCategory] = useState("Food & Dining");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; price: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          source: previewImage ? "RECEIPT_OCR" : "WEB_MANUAL",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Transaction</h2>
              <p className="text-[11px] text-slate-400">Manual Entry or AI Receipt Vision OCR</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
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
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-950/20 hover:bg-purple-950/30 p-8 cursor-pointer transition-all hover:border-purple-500 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageUpload}
              />

              {ocrLoading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
                  <p className="text-xs font-semibold text-purple-200">
                    Gemini Vision AI is analyzing items, tax & total...
                  </p>
                </div>
              ) : previewImage ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={previewImage}
                    alt="Receipt"
                    className="max-h-48 rounded-xl object-contain shadow-md border border-slate-700"
                  />
                  <span className="text-xs text-purple-300 font-semibold underline">
                    Click to change photo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Take Photo or Upload Receipt Image
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports JPG, PNG, WEBP receipts & invoices
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 Takes 2-3 seconds. AI will automatically identify the merchant name, total price, and itemize your purchases!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800/80 p-1">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  type === "EXPENSE"
                    ? "bg-rose-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-14 pr-4 py-2.5 text-base font-bold text-white outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Category Selector */}
            {type === "EXPENSE" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
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
                Description / Merchant
              </label>
              <input
                type="text"
                placeholder="e.g. Starbucks, Supermarket, Grab ride"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Itemized Scanned Items Preview if any */}
            {scannedItems.length > 0 && (
              <div className="rounded-xl bg-purple-950/30 border border-purple-500/20 p-3 text-xs space-y-1.5">
                <div className="font-semibold text-purple-300 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Itemized Receipt Breakdown</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {scannedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300 text-[11px]">
                      <span>{item.name}</span>
                      <span className="font-mono">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

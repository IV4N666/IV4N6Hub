"use client";

import React from "react";
import Link from "next/link";
import { Transaction } from "@/lib/types";
import { formatCurrency, getCategoryMeta } from "@/lib/category-meta";
import {
  Mic,
  MessageSquare,
  Globe,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
  Camera,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";

interface RecentTransactionsProps {
  transactions: Transaction[];
  currency: string;
  onOpenAddModal?: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  currency,
  onOpenAddModal,
}) => {
  const recent = transactions.slice(0, 7);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "WHATSAPP_VOICE":
        return (
          <span className="flex items-center gap-1 rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
            <Mic className="h-3 w-3 text-purple-400" />
            <span>WA Voice</span>
          </span>
        );
      case "WHATSAPP_TEXT":
        return (
          <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
            <MessageSquare className="h-3 w-3 text-emerald-400" />
            <span>WA Text</span>
          </span>
        );
      case "RECEIPT_OCR":
        return (
          <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
            <Camera className="h-3 w-3 text-amber-400" />
            <span>OCR</span>
          </span>
        );
      case "RECURRING":
        return (
          <span className="flex items-center gap-1 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
            <Repeat className="h-3 w-3 text-indigo-400" />
            <span>Auto-Bill</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
            <Globe className="h-3 w-3 text-blue-400" />
            <span>Web</span>
          </span>
        );
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Recent Spending & Activity
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Logged automatically via WhatsApp AI, Subscriptions, or Ledger entry
          </p>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-slate-400">No transactions logged yet.</p>
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Add First Transaction
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {recent.map((tx) => {
            const meta = getCategoryMeta(tx.category);
            const isIncome = tx.type === "INCOME";
            const isTransfer = tx.type === "TRANSFER";

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3.5 transition-colors hover:bg-slate-800/30 px-2 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      isTransfer
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        : isIncome
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-[280px]">
                        {tx.description || tx.category}
                      </span>
                      {getSourceBadge(tx.source)}
                      {tx.subCategory && (
                        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                          {tx.subCategory}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
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
                            <span className="text-slate-400">
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
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
                      isTransfer
                        ? "text-indigo-300"
                        : isIncome
                        ? "text-emerald-400"
                        : "text-slate-100"
                    }`}
                  >
                    {isTransfer ? "↔ " : isIncome ? "+" : "-"}
                    {formatCurrency(tx.amount, tx.currency || currency)}
                  </div>
                  {tx.rawInput && (
                    <div className="text-[10px] text-slate-500 max-w-[130px] truncate">
                      &quot;{tx.rawInput}&quot;
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

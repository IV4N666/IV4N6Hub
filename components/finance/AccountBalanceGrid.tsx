"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Landmark,
  Smartphone,
  CreditCard,
  TrendingUp,
  Vault,
  Plus,
  ArrowRightLeft,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Account, AccountType } from "@/lib/types";
import { formatCurrency, ACCOUNT_TYPE_META } from "@/lib/category-meta";

interface AccountBalanceGridProps {
  accounts: Account[];
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  currency: string;
  onOpenTransferModal?: () => void;
  onRefresh?: () => void;
}

const getAccountIcon = (type: AccountType) => {
  switch (type) {
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

export const AccountBalanceGrid: React.FC<AccountBalanceGridProps> = ({
  accounts,
  summary,
  currency,
  onOpenTransferModal,
  onRefresh,
}) => {
  return (
    <div className="space-y-4">
      {/* Net Worth & Assets Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              💎 Net Worth (净资产)
            </span>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
              Total Balance
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                summary.netWorth >= 0 ? "text-white" : "text-rose-400"
              }`}
            >
              {formatCurrency(summary.netWorth, currency)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Assets minus active credit & liabilities
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              📈 Total Assets (总资金)
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              {accounts.filter((a) => a.type !== "CREDIT_CARD").length} Accounts
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400">
              {formatCurrency(summary.totalAssets, currency)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Cash, Bank deposits & E-Wallets
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/30 via-slate-900/90 to-slate-950 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-300">
              💳 Credit & Liabilities (负债/待还)
            </span>
            <span className="text-xs text-pink-400 font-semibold">
              {accounts.filter((a) => a.type === "CREDIT_CARD").length} Cards
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-pink-400">
              {formatCurrency(summary.totalLiabilities, currency)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Credit cards & outstanding balances
          </p>
        </div>
      </div>

      {/* Accounts List Bar Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Vault className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Multi-Account Balances (多账户资金池)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTransferModal && (
            <button
              onClick={onOpenTransferModal}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-indigo-200 transition-all active:scale-95"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-400" />
              <span>Transfer</span>
            </button>
          )}

          <Link
            href="/accounts"
            className="flex items-center gap-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:text-white"
          >
            <span>Manage All</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {accounts.map((acc) => {
          const Icon = getAccountIcon(acc.type);
          const meta = ACCOUNT_TYPE_META[acc.type] || ACCOUNT_TYPE_META.BANK;
          const isNegative = acc.balance < 0;

          return (
            <div
              key={acc.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-lg"
            >
              {/* Top Row: Icon + Type Tag */}
              <div className="flex items-center justify-between">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10"
                  style={{
                    backgroundColor: `${acc.color || meta.defaultColor}20`,
                    color: acc.color || meta.defaultColor,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  {meta.label}
                </span>
              </div>

              {/* Middle: Name & Balance */}
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-slate-300 truncate group-hover:text-white transition-colors">
                  {acc.name}
                </h4>
                <p
                  className={`mt-1 text-lg font-black tracking-tight ${
                    isNegative ? "text-rose-400" : "text-white"
                  }`}
                >
                  {formatCurrency(acc.balance, acc.currency || currency)}
                </p>
              </div>

              {/* Subtle neon glowing bottom edge */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: acc.color || meta.defaultColor }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  X,
  Command,
  Camera,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Paperclip,
} from "lucide-react";

interface GlobalAIQuickBarProps {
  currency: string;
  onActionCompleted?: () => void;
}

export const GlobalAIQuickBar: React.FC<GlobalAIQuickBarProps> = ({
  currency,
  onActionCompleted,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setResultMsg(null);
    }
  }, [isOpen]);

  const handleExecuteText = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToRun = (customText ?? input).trim();
    if (!textToRun || loading) return;

    setLoading(true);
    setResultMsg(null);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToRun,
          defaultCurrency: currency,
          autoSave: true,
          source: "WHATSAPP_TEXT",
        }),
      });
      const data = await res.json();
      setResultMsg(data.message || data.parsed?.replyMessage || "✅ 已执行指令！");
      setInput("");
      if (data.intent !== "DATA_QUERY" && data.intent !== "CLARIFICATION" && onActionCompleted) {
        // Trigger background refresh event
        window.dispatchEvent(new CustomEvent("iv4n6-data-updated"));
      }
    } catch (err: any) {
      setResultMsg(`⚠️ 请求出错: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileOrPaste = async (file: File) => {
    setLoading(true);
    setResultMsg(`🔍 正在使用 Gemini Vision 识别 ${file.name || "剪贴板图片"}...`);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const raw = reader.result as string;
        const base64Data = raw.includes(",") ? raw.split(",")[1].trim() : raw.trim();
        const res = await fetch("/api/ai/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ANALYZE",
            fileBase64: base64Data,
            mimeType: file.type || "image/jpeg",
            fileName: file.name || "pasted-image.png",
            currency,
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success && data.docType === "RECEIPT_SINGLE") {
          setResultMsg(data.message || "✅ 小票已自动识别入账！");
          window.dispatchEvent(new CustomEvent("iv4n6-data-updated"));
        } else if (data.success && data.docType === "TODO_OR_NOTE") {
          setResultMsg(data.message || "📝 已提取图片中的待办/便签！");
          window.dispatchEvent(new CustomEvent("iv4n6-data-updated"));
        } else if (data.success && data.statement) {
          const s = data.summary;
          setResultMsg(
            `📊 识别到对账单 (${s.totalStatementTransactions} 笔)：已匹配 ${s.matchedCount} 笔，漏记 ${s.missingCount} 笔。请前往 WhatsApp AI Hub 一键导入！`
          );
        } else {
          setResultMsg(data.error || "⚠️ 未能识别出有效金额或记录");
        }
      };
    } catch (err: any) {
      setLoading(false);
      setResultMsg(`⚠️ 识别失败: ${err.message}`);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileOrPaste(file);
          return;
        }
      }
    }
  };

  return (
    <>
      {/* Floating Bottom-Right AI Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="AI 随处速记与查账 (快捷键 Ctrl + K)"
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 px-4 py-3 text-xs font-extrabold text-white shadow-xl shadow-emerald-600/30 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
        <span>AI 速记 / 查账</span>
        <kbd className="hidden sm:inline-block rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-emerald-200 border border-white/10">
          Ctrl+K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl border border-emerald-500/40 bg-slate-900/95 shadow-2xl overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Command className="h-4 w-4" />
                <span>IV4N6Hub 全站 AI 快捷指令中心 (支持记账 / 转账 / 查账 / Ctrl+V 粘贴小票截图)</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleExecuteText} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileOrPaste(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  title="上传小票图片或账单"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  disabled={loading}
                  placeholder="输入如：打油50现金 / 从Maybank转200到TNG / 我本月花了多少 / 或直接 Ctrl+V 贴图..."
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-11 px-4 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>执行</span>
                </button>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  "📊 我这个月总共花了多少钱？",
                  "💳 目前各个账户余额多少？",
                  "🍜 吃午餐 15.50 现金",
                  "⛽ 打油 50 Maybank",
                  "📋 提醒我明天下午交水电费",
                  "🚫 撤销刚刚那笔记录",
                ].map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loading}
                    onClick={() => handleExecuteText(undefined, chip)}
                    className="rounded-lg bg-slate-800/90 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/40 px-2.5 py-1 text-[11px] text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Response Output Box */}
              {resultMsg && (
                <div className="mt-3 rounded-2xl bg-slate-950/90 border border-emerald-500/30 p-3.5 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {resultMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

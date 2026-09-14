"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Moon,
  Award,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Calendar,
  HeartHandshake,
} from "lucide-react";
import { EnrichedPlannerTask } from "@/lib/planner-utils";

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: EnrichedPlannerTask[];
  completedHabits?: string[];
  onRolloverTasks?: (taskIds: string[]) => void;
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  isOpen,
  onClose,
  tasks,
  completedHabits = [],
  onRolloverTasks,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<{
    productivityScore: number;
    highlight: string;
    reflectionText: string;
    tomorrowAdvice: string;
    rolloverTaskIds: string[];
  } | null>(null);

  const [rolledOver, setRolledOver] = useState(false);

  if (!isOpen) return null;

  const handleStartReview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/todos/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVIEW",
          tasks,
          completedHabits,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewResult({
          productivityScore: data.productivityScore,
          highlight: data.highlight,
          reflectionText: data.reflectionText,
          tomorrowAdvice: data.tomorrowAdvice,
          rolloverTaskIds: data.rolloverTaskIds || [],
        });
      } else {
        setError(data.error || "AI 复盘生成失败，请稍后重试。");
      }
    } catch (e) {
      console.error(e);
      setError("网络请求失败，请检查网络连接后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRollover = () => {
    if (reviewResult?.rolloverTaskIds && reviewResult.rolloverTaskIds.length > 0) {
      onRolloverTasks?.(reviewResult.rolloverTaskIds);
      setRolledOver(true);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-indigo-500/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25">
              <Moon className="h-4.5 w-4.5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                AI 晚间复盘与反思
                <span className="text-[10px] rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 font-bold">
                  Daily Review
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                记录今天的心流、肯定每一个微小进步，接纳未完成并从容备战明日。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold">今日已完成</p>
              <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                {completedCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold">待顺延事项</p>
              <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-center">
              <p className="text-[10px] text-slate-400 font-semibold">习惯打卡</p>
              <p className="text-lg font-black text-purple-400 font-mono mt-0.5">
                {completedHabits.length}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-center space-y-3">
              <p className="text-xs text-rose-300 font-semibold">⚠️ {error}</p>
              <button
                onClick={handleStartReview}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition-all active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>重试</span>
              </button>
            </div>
          )}

          {!reviewResult ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">准备好生成今日的晚间复盘了吗？</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  AI 将根据今日任务达成度、核心青蛙攻坚情况与习惯打卡，为您提供温暖深刻的反馈与明日规划。
                </p>
              </div>
              <button
                onClick={handleStartReview}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 text-xs font-extrabold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
              >
                {loading ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>Gemini AI 正在深入复盘思考...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>开始智能复盘分析</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {/* Productivity Score Card */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-slate-900 to-purple-950/20 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">今日身心与生产力综合评分</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{reviewResult.highlight}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-indigo-300">
                    {reviewResult.productivityScore}
                  </span>
                  <span className="text-xs text-slate-500 font-mono"> / 100</span>
                </div>
              </div>

              {/* Reflection Text */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <HeartHandshake className="h-4 w-4" />
                  <span>复盘寄语与心流反馈</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  “{reviewResult.reflectionText}”
                </p>
              </div>

              {/* Tomorrow Advice */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>明日节奏与精力建议</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {reviewResult.tomorrowAdvice}
                </p>
              </div>

              {/* Rollover Section */}
              {pendingCount > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-amber-200/90">
                    <p className="font-bold">尚有 {pendingCount} 项任务未完成？</p>
                    <p className="text-[11px] text-amber-300/70 mt-0.5">
                      点击即可一键将未完成事项顺延至明日，卸下今日心理负担。
                    </p>
                  </div>

                  <button
                    onClick={handleExecuteRollover}
                    disabled={rolledOver}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                      rolledOver
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 active:scale-95"
                    }`}
                  >
                    {rolledOver ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>已顺延至明天！</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>一键顺延至明日</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center">
          {reviewResult && (
            <button
              onClick={handleStartReview}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>重新生成</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 text-xs font-bold transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

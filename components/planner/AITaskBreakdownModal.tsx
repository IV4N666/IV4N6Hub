"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  ListChecks,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { EnrichedPlannerTask, SubTask, TimeBlock } from "@/lib/planner-utils";

interface AITaskBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: EnrichedPlannerTask | null;
  onSaveSubtasks: (
    taskId: string,
    subtasks: SubTask[],
    suggestedBlock?: TimeBlock,
    estimatedMinutes?: number
  ) => void;
}

export const AITaskBreakdownModal: React.FC<AITaskBreakdownModalProps> = ({
  isOpen,
  onClose,
  task,
  onSaveSubtasks,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [suggestedBlock, setSuggestedBlock] = useState<TimeBlock>("MORNING");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(45);
  const [frogReason, setFrogReason] = useState<string>("");
  const [newStepText, setNewStepText] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      setError(null);
      if (task.subtasks && task.subtasks.length > 0) {
        setSubtasks(task.subtasks);
        setSuggestedBlock(task.timeBlock || "MORNING");
        setEstimatedMinutes(task.estimatedMinutes || 45);
      } else {
        handleGenerateBreakdown();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task?.id, task?.title]);

  if (!isOpen || !task) return null;

  const handleGenerateBreakdown = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/todos/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BREAKDOWN",
          taskTitle: task.title,
          taskDescription: task.cleanDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubtasks(data.subtasks || []);
        if (data.suggestedTimeBlock) setSuggestedBlock(data.suggestedTimeBlock);
        if (data.totalEstimatedMinutes) setEstimatedMinutes(data.totalEstimatedMinutes);
        if (data.frogReason) setFrogReason(data.frogReason);
      }
    } catch (e) {
      console.error(e);
      setError("AI 拆解失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub_${Date.now()}`,
        text: newStepText.trim(),
        isCompleted: false,
        estimatedMinutes: 15,
      },
    ]);
    setNewStepText("");
  };

  const handleRemoveStep = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    onSaveSubtasks(task.id, subtasks, suggestedBlock, estimatedMinutes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/30 via-slate-900 to-slate-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-500/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                AI 目标拆解助手
                <span className="text-[10px] rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 font-bold">
                  Task Decomposition
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                将模糊的大目标瞬间化为清晰可执行的微行动步骤。
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

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Target Task Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] font-bold text-purple-300">目标任务:</span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {task.isFrog ? "🐸 " : ""}
              {task.title}
            </h3>
            {task.cleanDescription && (
              <p className="text-xs text-slate-400 mt-1">{task.cleanDescription}</p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-center space-y-3">
              <p className="text-xs text-rose-300 font-semibold">⚠️ {error}</p>
              <button
                onClick={handleGenerateBreakdown}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition-all active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>重新拆解</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-purple-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                Gemini 正在分析任务逻辑，构建高效拆解步骤...
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {frogReason && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs text-amber-200 flex items-start gap-2">
                  <span className="text-sm">🐸</span>
                  <span className="leading-snug">{frogReason}</span>
                </div>
              )}

              {/* Subtasks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    执行清单 ({subtasks.length}步):
                  </span>
                  <span className="font-mono text-purple-300 font-bold">
                    ⏱️ 预计总耗时: {estimatedMinutes} 分钟
                  </span>
                </div>

                <div className="space-y-1.5">
                  {subtasks.map((st, idx) => (
                    <div
                      key={st.id}
                      className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-200"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-black rounded bg-purple-500/20 text-purple-300 px-1.5 py-0.5 font-mono shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-slate-200 break-words leading-relaxed">{st.text}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {st.estimatedMinutes && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {st.estimatedMinutes}m
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveStep(st.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Step Input */}
                <form onSubmit={handleAddCustomStep} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="添加补充步骤..."
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

              {/* Time Block & Estimated Minutes Tuning */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                    推荐时间块:
                  </label>
                  <select
                    value={suggestedBlock}
                    onChange={(e) => setSuggestedBlock(e.target.value as TimeBlock)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 outline-none cursor-pointer"
                  >
                    <option value="MORNING">🌅 早间专注时段</option>
                    <option value="AFTERNOON">☀️ 午后推进时段</option>
                    <option value="EVENING">🌙 晚间复盘时段</option>
                    <option value="ANYTIME">⏳ 灵活备选</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                    预估总耗时 (分钟):
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handleGenerateBreakdown}
            disabled={loading}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>重新由 AI 拆解</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 text-xs font-bold transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 text-xs font-bold transition-all shadow-md shadow-purple-600/30 active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>应用到计划本</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

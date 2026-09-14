"use client";

import React from "react";
import { CheckCircle2, Circle, Sparkles, Target, Star, Flame } from "lucide-react";
import { EnrichedPlannerTask } from "@/lib/planner-utils";

interface PlannerFrogBannerProps {
  tasks: EnrichedPlannerTask[];
  onToggleTask: (task: EnrichedPlannerTask) => void;
  onToggleFrog: (task: EnrichedPlannerTask) => void;
  onOpenBreakdown?: (task: EnrichedPlannerTask) => void;
}

export const PlannerFrogBanner: React.FC<PlannerFrogBannerProps> = ({
  tasks,
  onToggleTask,
  onToggleFrog,
  onOpenBreakdown,
}) => {
  const frogs = tasks.filter((t) => t.isFrog);
  const completedFrogs = frogs.filter((t) => t.status === "COMPLETED");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-amber-950/20 p-4 sm:p-5 shadow-xl shadow-amber-950/20 backdrop-blur-md">
      {/* Decorative ambient glow */}
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/25 shrink-0 font-bold text-base">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                今日核心焦点 <span className="text-amber-400 text-xs font-semibold">Top 3 Focus</span>
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                <Flame className="h-3 w-3 text-amber-400 fill-amber-400" />
                {completedFrogs.length} / {Math.max(frogs.length, 3)} 达成
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              每天清晨聚焦 3 件最具战略价值的高杠杆事项，优先攻克，保持高能。
            </p>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{
                width: `${frogs.length > 0 ? (completedFrogs.length / frogs.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-amber-300">
            {frogs.length > 0 ? Math.round((completedFrogs.length / frogs.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Frogs Cards Grid */}
      {frogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/25 p-4 sm:p-5 text-center bg-amber-500/5">
          <p className="text-xs text-amber-200/80 font-medium">
            💡 今日尚未选定核心焦点任务。点击下方任意任务卡片的 <span className="font-bold text-amber-300">“🎯 设为核心焦点”</span>，将其置顶于今日专注区！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {frogs.slice(0, 3).map((task, idx) => {
            const isDone = task.status === "COMPLETED";
            const subtotal = task.subtasks.length;
            const subdone = task.subtasks.filter((s) => s.isCompleted).length;

            return (
              <div
                key={task.id}
                className={`relative rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-2.5 ${
                  isDone
                    ? "border-emerald-500/30 bg-emerald-950/15 opacity-75"
                    : "border-amber-500/30 bg-slate-900/80 hover:border-amber-400/50 shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => onToggleTask(task)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                      ) : (
                        <Circle className="h-4.5 w-4.5 text-amber-400 hover:scale-110 transition-transform" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black rounded bg-amber-500/20 text-amber-300 px-1 py-0.2">
                          #{idx + 1}
                        </span>
                        <h3
                          className={`text-xs font-bold leading-tight break-words ${
                            isDone ? "line-through text-slate-500" : "text-white"
                          }`}
                        >
                          {task.title}
                        </h3>
                      </div>

                      {task.cleanDescription && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                          {task.cleanDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFrog(task)}
                    title="移出今日焦点"
                    className="text-amber-400/60 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-amber-300">
                      ⏱️ {task.estimatedMinutes}m
                    </span>
                    {subtotal > 0 && (
                      <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-slate-300">
                        步骤 {subdone}/{subtotal}
                      </span>
                    )}
                  </div>

                  {subtotal === 0 && onOpenBreakdown && (
                    <button
                      onClick={() => onOpenBreakdown(task)}
                      className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>AI 拆解</span>
                    </button>
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

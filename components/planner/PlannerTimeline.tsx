"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Trash2,
  MoreHorizontal,
  Plus,
  ArrowRight,
  Sun,
  Sunrise,
  Moon,
  Inbox,
  Check,
} from "lucide-react";
import { EnrichedPlannerTask, SubTask, TimeBlock } from "@/lib/planner-utils";

interface PlannerTimelineProps {
  tasks: EnrichedPlannerTask[];
  onToggleTask: (task: EnrichedPlannerTask) => void;
  onToggleFrog: (task: EnrichedPlannerTask) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskBlock: (task: EnrichedPlannerTask, block: TimeBlock) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onOpenBreakdown: (task: EnrichedPlannerTask) => void;
  onQuickAddInBlock: (block: TimeBlock) => void;
  onExportSingleTaskIcs: (taskId: string) => void;
}

const BLOCK_CONFIGS: Array<{
  key: TimeBlock;
  title: string;
  timeRange: string;
  icon: React.ElementType;
  colorClass: string;
  bgGradient: string;
  tagline: string;
}> = [
  {
    key: "MORNING",
    title: "早间专注时段",
    timeRange: "08:00 - 12:00",
    icon: Sunrise,
    colorClass: "text-amber-400 border-amber-500/30",
    bgGradient: "from-amber-500/10 via-slate-900/60 to-transparent",
    tagline: "黄金精力期，吃掉最重要的青蛙，攻坚高认知负荷要务",
  },
  {
    key: "AFTERNOON",
    title: "午后推进时段",
    timeRange: "12:00 - 18:00",
    icon: Sun,
    colorClass: "text-sky-400 border-sky-500/30",
    bgGradient: "from-sky-500/10 via-slate-900/60 to-transparent",
    tagline: "协同推进期，适宜沟通协作、会议讨论、多步骤常规事务",
  },
  {
    key: "EVENING",
    title: "晚间充电与复盘",
    timeRange: "18:00 - 22:00",
    icon: Moon,
    colorClass: "text-indigo-400 border-indigo-500/30",
    bgGradient: "from-indigo-500/10 via-slate-900/60 to-transparent",
    tagline: "反思复盘期，适宜深度阅读、个人充电、整理并复盘明日",
  },
  {
    key: "ANYTIME",
    title: "灵活待办池",
    timeRange: "Anytime",
    icon: Inbox,
    colorClass: "text-slate-400 border-slate-700/50",
    bgGradient: "from-slate-800/20 via-slate-900/60 to-transparent",
    tagline: "尚未分配固定时段的待办灵感与碎片事项",
  },
];

export const PlannerTimeline: React.FC<PlannerTimelineProps> = ({
  tasks,
  onToggleTask,
  onToggleFrog,
  onDeleteTask,
  onUpdateTaskBlock,
  onToggleSubtask,
  onOpenBreakdown,
  onQuickAddInBlock,
  onExportSingleTaskIcs,
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatTotalTime = (taskList: EnrichedPlannerTask[]) => {
    const totalMinutes = taskList
      .filter((t) => t.status === "PENDING")
      .reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
    if (totalMinutes === 0) return null;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {BLOCK_CONFIGS.map((config) => {
        const blockTasks = tasks.filter((t) => (t.timeBlock || "ANYTIME") === config.key);
        const pendingCount = blockTasks.filter((t) => t.status === "PENDING").length;
        const totalDuration = formatTotalTime(blockTasks);
        const Icon = config.icon;

        return (
          <div
            key={config.key}
            className={`rounded-2xl border ${config.colorClass} bg-gradient-to-b ${config.bgGradient} p-3.5 sm:p-4 shadow-lg backdrop-blur-md transition-all`}
          >
            {/* Header of Block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-700/60 shrink-0">
                  <Icon className={`h-4 w-4 ${config.colorClass.split(" ")[0]}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h3 className="text-sm font-black tracking-tight text-white">
                      {config.title}
                    </h3>
                    <span className="font-mono text-[10px] rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-400">
                      {config.timeRange}
                    </span>
                    {totalDuration && (
                      <span className="font-mono text-[10px] rounded-full bg-slate-800 px-2 py-0.5 text-amber-300 font-bold">
                        ⏱️ {totalDuration}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate sm:whitespace-normal">
                    {config.tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 self-stretch sm:self-center pt-1 sm:pt-0">
                <span className="text-[11px] sm:text-xs font-mono text-slate-400">
                  {pendingCount} 项待办
                </span>
                <button
                  onClick={() => onQuickAddInBlock(config.key)}
                  className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-200 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>添加</span>
                </button>
              </div>
            </div>

            {/* Tasks inside this block */}
            {blockTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800/80 p-3.5 sm:p-4 text-center">
                <p className="text-[11px] sm:text-xs text-slate-500">
                  此时段暂无安排任务。点击“添加”或使用“✨ AI 智能排程”一键分配。
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {blockTasks.map((task) => {
                  const isDone = task.status === "COMPLETED";
                  const isExpanded = Boolean(expandedTasks[task.id]);
                  const subtotal = task.subtasks.length;
                  const subdone = task.subtasks.filter((s) => s.isCompleted).length;

                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isDone
                          ? "border-slate-800/50 bg-slate-950/40 opacity-65"
                          : task.isFrog
                          ? "border-amber-500/40 bg-slate-900/90 shadow-md shadow-amber-950/20"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      {/* Main Task Card */}
                      <div className="p-3 sm:p-3.5 space-y-2.5">
                        {/* Top: Checkbox, Title, Frog Toggle */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <button
                              onClick={() => onToggleTask(task)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0 p-0.5"
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                              ) : (
                                <Circle className="h-4.5 w-4.5 text-slate-500 hover:text-emerald-400" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {task.isFrog && (
                                  <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold">
                                    🐸 核心青蛙
                                  </span>
                                )}
                                <span
                                  className={`text-xs font-bold break-words ${
                                    isDone ? "line-through text-slate-500" : "text-white"
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>

                              {task.cleanDescription && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {task.cleanDescription}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Top Right: Quick Frog Pin */}
                          <button
                            onClick={() => onToggleFrog(task)}
                            title={task.isFrog ? "取消青蛙标记" : "设为今日核心青蛙"}
                            className={`p-1.5 rounded-lg transition-colors text-xs shrink-0 ${
                              task.isFrog
                                ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                                : "text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                            }`}
                          >
                            🐸
                          </button>
                        </div>

                        {/* Bottom Utility Bar: Badges + Responsive Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 font-mono text-slate-300">
                              ⏱️ {task.estimatedMinutes}m
                            </span>

                            <span
                              className={`rounded px-1.5 py-0.5 font-bold ${
                                task.priority === "HIGH"
                                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                  : task.priority === "MEDIUM"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {task.priority}
                            </span>

                            {subtotal > 0 && (
                              <button
                                onClick={() => toggleExpand(task.id)}
                                className="flex items-center gap-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-0.5 text-purple-300 font-medium"
                              >
                                <span>
                                  步骤 {subdone}/{subtotal}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            )}

                            {subtotal === 0 && (
                              <button
                                onClick={() => onOpenBreakdown(task)}
                                className="flex items-center gap-1 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-2 py-0.5 font-bold text-purple-300 transition-colors"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span>AI 拆解</span>
                              </button>
                            )}
                          </div>

                          {/* Right Controls: Shift block, Calendar, Delete */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            {/* Time Block Selector */}
                            <select
                              value={task.timeBlock}
                              onChange={(e) =>
                                onUpdateTaskBlock(task, e.target.value as TimeBlock)
                              }
                              className="rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 px-1.5 py-1 outline-none cursor-pointer"
                            >
                              <option value="MORNING">🌅 早间</option>
                              <option value="AFTERNOON">☀️ 下午</option>
                              <option value="EVENING">🌙 晚间</option>
                              <option value="ANYTIME">⏳ 灵活</option>
                            </select>

                            <button
                              onClick={() => onExportSingleTaskIcs(task.id)}
                              title="同步至手机/电脑系统日历"
                              className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => onDeleteTask(task.id)}
                              title="删除"
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Subtasks Accordion Checklist */}
                      {subtotal > 0 && isExpanded && (
                        <div className="border-t border-slate-800/80 bg-slate-900/40 p-3 pl-4 sm:pl-8 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span className="font-semibold text-slate-300">
                              行动步骤 Checklist
                            </span>
                            <span className="font-mono text-purple-300 font-bold">
                              {Math.round((subdone / subtotal) * 100)}% 完成
                            </span>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                              style={{ width: `${(subdone / subtotal) * 100}%` }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            {task.subtasks.map((st) => (
                              <div
                                key={st.id}
                                onClick={() => onToggleSubtask(task.id, st.id)}
                                className="flex items-center gap-2 cursor-pointer text-xs group py-1 px-1.5 rounded-lg hover:bg-slate-800/50"
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                                    st.isCompleted
                                      ? "border-purple-400 bg-purple-600 text-white"
                                      : "border-slate-700 bg-slate-900 group-hover:border-purple-400"
                                  }`}
                                >
                                  {st.isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <span
                                  className={`text-[11px] break-words flex-1 ${
                                    st.isCompleted
                                      ? "line-through text-slate-500"
                                      : "text-slate-200 group-hover:text-white"
                                  }`}
                                >
                                  {st.text}
                                </span>
                                {st.estimatedMinutes && (
                                  <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1">
                                    {st.estimatedMinutes}m
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

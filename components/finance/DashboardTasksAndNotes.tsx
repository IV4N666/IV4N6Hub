"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  CheckSquare,
  StickyNote,
  Plus,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  Pin,
  Calendar,
  Clock,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { EnrichedPlannerTask, parsePlannerTask } from "@/lib/planner-utils";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  color?: string | null;
  createdAt: string;
}

export const DashboardTasksAndNotes: React.FC = () => {
  const [todos, setTodos] = useState<EnrichedPlannerTask[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuickTask, setNewQuickTask] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewTab, setViewTab] = useState<"TODOS" | "NOTES">("TODOS");
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const loadData = React.useCallback(async () => {
    try {
      const [todosRes, notesRes] = await Promise.all([
        fetch("/api/todos?status=PENDING"),
        fetch("/api/notes"),
      ]);
      const todosData = await todosRes.json();
      const notesData = await notesRes.json();

      if (todosData.success) {
        setTodos((todosData.todos || []).map(parsePlannerTask));
      }
      if (notesData.success) {
        setNotes(notesData.notes || []);
      }
    } catch (e) {
      console.error("Failed to load dashboard tasks and notes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleTodo = async (todo: EnrichedPlannerTask) => {
    const nextStatus = todo.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    // Optimistic UI update
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t)));

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, status: nextStatus }),
      });
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(loadData, 600);
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const handleAddQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickTask.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newQuickTask.trim(),
          priority: "MEDIUM",
        }),
      });
      const data = await res.json();
      if (data.success && data.todo) {
        setTodos([parsePlannerTask(data.todo), ...todos]);
        setNewQuickTask("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingTodos = todos.filter((t) => t.status === "PENDING");
  const frogCount = pendingTodos.filter((t) => t.isFrog).length;
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const displayNotes = [...pinnedNotes, ...notes.filter((n) => !n.isPinned)].slice(0, 4);

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-800/80 p-3.5 sm:p-5 shadow-xl space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <BookOpen className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                AI 计划本与便签
              </h3>
              {frogCount > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  🐸 {frogCount} 青蛙待办
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {pendingTodos.length} 项待完成 • {notes.length} 条灵感便签
            </p>
          </div>
        </div>

        {/* Tab switcher + View All link */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setViewTab("TODOS")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewTab === "TODOS"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckSquare className="h-3 w-3" />
              <span>计划 ({pendingTodos.length})</span>
            </button>
            <button
              onClick={() => setViewTab("NOTES")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewTab === "NOTES"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <StickyNote className="h-3 w-3" />
              <span>便签 ({notes.length})</span>
            </button>
          </div>

          <Link
            href="/notes"
            className="flex items-center gap-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white border border-slate-700/60 transition-all shrink-0"
          >
            <span>进入计划本</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Add Form (For Tasks) */}
      {viewTab === "TODOS" && (
        <form onSubmit={handleAddQuickTask} className="flex items-center gap-2">
          <input
            type="text"
            value={newQuickTask}
            onChange={(e) => setNewQuickTask(e.target.value)}
            placeholder="极速添加待办事项 (例如: 准备明天客户会谈 PPT)..."
            className="flex-1 min-w-0 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!newQuickTask.trim() || isSubmitting}
            className="flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all shrink-0 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">添加</span>
          </button>
        </form>
      )}

      {/* Content Body */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
          加载计划本数据中...
        </div>
      ) : viewTab === "TODOS" ? (
        /* Tasks List */
        <div className="space-y-2">
          {pendingTodos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400/60 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-300">所有计划已圆满达成！</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                在上方添加新计划，或进入计划本查看 Obsidian 联动与 AI 晚间复盘。
              </p>
            </div>
          ) : (
            pendingTodos.slice(0, 5).map((todo) => {
              const isCompleted = todo.status === "COMPLETED";
              const subtotal = todo.subtasks.length;
              const subdone = todo.subtasks.filter((s) => s.isCompleted).length;

              return (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    isCompleted
                      ? "border-slate-800/40 bg-slate-950/30 opacity-60"
                      : todo.isFrog
                      ? "border-amber-500/30 bg-slate-900/80 hover:border-amber-400/50"
                      : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors shrink-0 p-0.5"
                      title="标记完成"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-500 hover:text-emerald-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {todo.isFrog && (
                          <span className="text-[10px] rounded bg-amber-500/20 text-amber-300 px-1 py-0.2 font-bold shrink-0">
                            🐸
                          </span>
                        )}
                        <p
                          className={`text-xs font-semibold truncate ${
                            isCompleted ? "line-through text-slate-500" : "text-white"
                          }`}
                        >
                          {todo.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {todo.timeBlock === "MORNING"
                            ? "🌅 早间"
                            : todo.timeBlock === "AFTERNOON"
                            ? "☀️ 午后"
                            : todo.timeBlock === "EVENING"
                            ? "🌙 晚间"
                            : "⏳ 灵活"}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono">
                          ⏱️ {todo.estimatedMinutes}m
                        </span>

                        {subtotal > 0 && (
                          <span className="text-[10px] text-purple-300 font-mono">
                            步骤 {subdone}/{subtotal}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/notes"
                    className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Notes List */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {displayNotes.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-5 text-center">
              <StickyNote className="h-6 w-6 text-slate-600 mx-auto mb-1" />
              <p className="text-xs text-slate-400">暂无灵感便签</p>
            </div>
          ) : (
            displayNotes.map((note) => (
              <div
                key={note.id}
                className="relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5 sm:p-3 hover:border-slate-700 transition-all overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: note.color || "#8b5cf6" }}
                />
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate">{note.title}</h4>
                    {note.isPinned && <Pin className="h-3 w-3 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-300/80 line-clamp-2 mt-1 leading-relaxed">
                    {note.content}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-800/40 text-[9px] text-slate-500">
                  <span>{note.category}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

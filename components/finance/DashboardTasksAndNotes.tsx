"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { format } from "date-fns";

interface TodoTask {
  id: string;
  title: string;
  status: "PENDING" | "COMPLETED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate?: string | null;
  createdAt: string;
}

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
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuickTask, setNewQuickTask] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewTab, setViewTab] = useState<"TODOS" | "NOTES">("TODOS");

  const loadData = async () => {
    try {
      const [todosRes, notesRes] = await Promise.all([
        fetch("/api/todos?status=PENDING"),
        fetch("/api/notes"),
      ]);
      const todosData = await todosRes.json();
      const notesData = await notesRes.json();

      if (todosData.success) {
        setTodos(todosData.todos || []);
      }
      if (notesData.success) {
        setNotes(notesData.notes || []);
      }
    } catch (e) {
      console.error("Failed to load dashboard tasks and notes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTodo = async (todo: TodoTask) => {
    const nextStatus = todo.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    // Optimistic UI update
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t)));

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, status: nextStatus }),
      });
      setTimeout(loadData, 600);
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
        setTodos([data.todo, ...todos]);
        setNewQuickTask("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingTodos = todos.filter((t) => t.status === "PENDING");
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const displayNotes = [...pinnedNotes, ...notes.filter((n) => !n.isPinned)].slice(0, 4);

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl border border-slate-800/80 p-3.5 sm:p-5 shadow-xl space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <StickyNote className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Smart Tasks & Notes
              </h3>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
                待办与便签
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {pendingTodos.length} pending tasks • {notes.length} notes saved
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
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckSquare className="h-3 w-3" />
              <span>Tasks ({pendingTodos.length})</span>
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
              <span>Notes ({notes.length})</span>
            </button>
          </div>

          <Link
            href="/notes"
            className="flex items-center gap-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white border border-slate-700/60 transition-all shrink-0"
          >
            <span>View All</span>
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
            placeholder="Add quick task on phone (e.g. Call client at 4pm)..."
            className="flex-1 min-w-0 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newQuickTask.trim() || isSubmitting}
            className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all shrink-0 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>
      )}

      {/* Content Body */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
          Loading tasks & notes...
        </div>
      ) : viewTab === "TODOS" ? (
        /* Tasks List */
        <div className="space-y-2">
          {pendingTodos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400/60 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-300">All tasks completed!</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tell WhatsApp AI &quot;提醒我明天交话费&quot; or type above to add a task.
              </p>
            </div>
          ) : (
            pendingTodos.slice(0, 5).map((todo) => {
              const isCompleted = todo.status === "COMPLETED";
              return (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    isCompleted
                      ? "border-slate-800/40 bg-slate-950/30 opacity-60"
                      : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className="text-slate-400 hover:text-blue-400 transition-colors shrink-0 p-0.5"
                      title="Toggle Complete"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-500 hover:text-blue-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCompleted ? "line-through text-slate-500" : "text-white"
                        }`}
                      >
                        {todo.title}
                      </p>
                      {todo.dueDate && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Calendar className="h-2.5 w-2.5 text-blue-400" />
                          <span>{format(new Date(todo.dueDate), "MMM d")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      todo.priority === "HIGH"
                        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        : todo.priority === "MEDIUM"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {todo.priority}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Notes Grid / List */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {displayNotes.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-5 text-center">
              <StickyNote className="h-7 w-7 text-purple-400/60 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-300">No notes yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tell WhatsApp AI &quot;记一下：门禁密码是8842&quot; to capture ideas.
              </p>
            </div>
          ) : (
            displayNotes.map((note) => (
              <Link
                key={note.id}
                href="/notes"
                className="group rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-purple-500/40 p-3 transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {note.title}
                    </h4>
                    {note.isPinned && (
                      <Pin className="h-3 w-3 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                    {note.content}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-800/40">
                  <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300 font-medium">
                    {note.category}
                  </span>
                  <span>{format(new Date(note.createdAt), "MMM d")}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};
